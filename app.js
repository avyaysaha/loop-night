'use strict';
(() => {
  const SONGS = [
    'Perfect','Photograph','Thinking Out Loud','Shape of You','Castle on the Hill','Shivers',
    'Bad Habits','Sapphire','Azizam','Eyes Closed','The A Team','Lego House','Give Me Love',
    'Galway Girl','Happier','I See Fire','Sing','Dive','Celestial','Overpass Graffiti',
    'Afterglow','Visiting Hours','Bloodstream','Tenerife Sea','Nancy Mulligan','Don’t',
    'Beautiful People','South of the Border','Take Me Back to London','2step','Boat',
    'Curtains','End of Youth','Camera','Old Phone','Drive','You Need Me, I Don’t Need You',
    'Supermarket Flowers','One','All of the Stars','Kiss Me','Small Bump','Lovers in the Night'
  ];
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const safeGet = (key, fallback = null) => { try { const v = localStorage.getItem('loop-night:' + key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } };
  const safeSet = (key, value) => { try { localStorage.setItem('loop-night:' + key, JSON.stringify(value)); return true; } catch { toast('Browser storage is unavailable; your changes may not persist.'); return false; } };
  let toastTimeout;
  function toast(message) {
    const node = $('toast'); node.textContent = message; node.hidden = false;
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { node.hidden = true; }, 3800);
  }

  // Simple hash navigation supports both GitHub Pages subdirectories and local files.
  const screens = ['home','sing','bingo','loop','memory'];
  function navigate(name) {
    const screen = screens.includes(name) ? name : 'home';
    screens.forEach((id) => { $(id).hidden = id !== screen; });
    $$('[data-target]').forEach((button) => {
      const selected = button.classList.contains('selected');
      if (selected) button.classList.remove('selected');
    });
    $$('.bottom-nav [data-target]').forEach((button) => {
      const active = button.dataset.target === screen;
      button.classList.toggle('selected', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (screen !== 'sing') { stopLyrics(); stopRecognition(); }
    if (screen !== 'loop') stopLoop();
    window.scrollTo({top:0,behavior:'instant'});
  }
  $$('[data-target]').forEach((button) => button.addEventListener('click', () => { location.hash = button.dataset.target; }));
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));
  window.addEventListener('pagehide', () => { stopLyrics(); stopRecognition(); stopLoop(); });

  // SONGS AND PRIVATE LYRICS
  let song = safeGet('song', 'Perfect');
  if (!SONGS.includes(song)) song = 'Perfect';
  let parsedLyrics = [];
  let lineIndex = 0;

  // Loop Tour poster asset used in the hero and souvenir card.
  let loopTourPoster = null;
  const loopTourPosterReady = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { loopTourPoster = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = './loop-tour.jpg';
  });
  // Direct links only for official artist lyric videos that were individually verified.
  // Other songs open a YouTube search (not an unverified video link).
  const OFFICIAL_LYRIC_VIDEOS = {
    'Shape of You': 'https://www.youtube.com/watch?v=_dK2tDK9grQ',
    'Thinking Out Loud': 'https://www.youtube.com/watch?v=Q5z6RHIpi2Y',
    'Shivers': 'https://www.youtube.com/watch?v=z2_Lrg6rRks',
    'Castle on the Hill': 'https://www.youtube.com/watch?v=7Qp5vcuMIlk'
  };
  const DEMO_LYRICS = `[verse]
Beneath the lights we come alive
Together for a night like this
[chorus]
Let the music take us higher
Every heartbeat finds its rhythm
[verse]
Sing it out beneath the stars
[chorus]
Hold this moment in the air`;
  let lyricTimer = null, lyricFrame = null;
  let lyricElapsed = 0, lyricClockStart = 0, lastClockDraw = 0;
  let demoActive = false;
  const lyricsKey = (name) => 'lyrics:' + name;
  const normalizedName = (name) => name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'');
  function showSongList(filter = '') {
    const query=filter.trim().toLowerCase();
    const list=$('song-list'); list.replaceChildren();
    const matches=SONGS.filter(name=>name.toLowerCase().includes(query));
    if(!matches.length){const p=document.createElement('p');p.className='muted';p.textContent='No matching songs.';list.append(p);return;}
    matches.forEach(name=>{
      const item=document.createElement('button');item.type='button';
      item.className='song-option'+(song===name?' active':'');
      item.setAttribute('aria-pressed',String(song===name));
      const hasLyrics=!!safeGet(lyricsKey(name),'');
      const label=document.createElement('span'); label.textContent=hasLyrics?'✓ SAVED':String(SONGS.indexOf(name)+1).padStart(2,'0');
      item.append(document.createTextNode(name),label);
      item.addEventListener('click',()=>selectSong(name));list.append(item);
    });
  }
  function parseLyrics(source) {
    let chorusNext=false, offsetMs=0; const lines=[];
    for(const raw of source.split(/\r?\n/)){
      const line=raw.trim(); if(!line)continue;
      const section=line.match(/^\[(chorus|verse|bridge|intro|outro|pre-chorus|instrumental)(?:\s*\d+)?\]$/i);
      if(section){chorusNext=section[1].toLowerCase()==='chorus';continue;}
      const offset=line.match(/^\[offset:\s*([+-]?\d+)\]$/i);
      if(offset){offsetMs=Number(offset[1]);continue;}
      if(/^\[(?:ar|ti|al|by|length|re|ve):.*\]$/i.test(line))continue;
      const timePattern=/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
      const tags=[...line.matchAll(timePattern)];
      const text=line.replace(timePattern,'').trim();
      if(!text)continue;
      if(tags.length){
        for(const tag of tags){
          const mins=Number(tag[1]),secs=Number(tag[2]), fraction=tag[3]||'';
          if(secs>59)continue;
          const time=Math.max(0,mins*60+secs+(fraction?Number(fraction)/10**fraction.length:0)+offsetMs/1000);
          lines.push({text,chorusStart:chorusNext,time});
        }
      }else if(!/^\[.*\]$/.test(line))lines.push({text,chorusStart:chorusNext,time:null});
      chorusNext=false;
    }
    if(lines.some(line=>line.time!==null))return lines.filter(line=>line.time!==null).sort((a,b)=>a.time-b.time);
    return lines;
  }
  const lyricsTimed=()=>parsedLyrics.length>0&&parsedLyrics.some(line=>line.time!==null);
  const songEnd=()=>parsedLyrics.length?parsedLyrics[parsedLyrics.length-1].time+10:0;
  const clockText=(n)=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
  function updateTimeline(){
    if(!lyricsTimed())return;
    const duration=songEnd();
    $('timed-clock').textContent=clockText(lyricElapsed)+' / '+clockText(duration);
    $('timed-seek').max=String(duration);
    $('timed-seek').value=String(Math.min(duration,lyricElapsed));
  }
  function closestTimedIndex(t){
    let index=0;
    for(let i=0;i<parsedLyrics.length;i++){
      if(parsedLyrics[i].time<=t+0.025)index=i;
      else break;
    }
    return index;
  }
  function seekLyrics(time){
    if(!lyricsTimed())return;
    lyricElapsed=Math.max(0,Math.min(time,songEnd()));
    lyricClockStart=performance.now()-lyricElapsed*1000;
    lineIndex=closestTimedIndex(lyricElapsed);
    updateTimeline();renderLyrics();
  }
  function selectSong(next){
    if(!SONGS.includes(next))return;
    stopLyrics();song=next;safeSet('song',song);
    $('now-song').textContent=song;
    const link=$('lyric-video-link');
    const official=OFFICIAL_LYRIC_VIDEOS[song];
    link.href=official||'https://www.youtube.com/results?search_query='+encodeURIComponent('Ed Sheeran '+song+' official lyric video');
    link.textContent=official?'▶ Open official lyric video ↗':'⌕ Search official lyric video ↗';
    $('lyric-editor').hidden=true;
    $('lyric-input').value=safeGet(lyricsKey(song),'')||'';
    demoActive=false;
    parsedLyrics=parseLyrics($('lyric-input').value);
    lyricElapsed=0;lineIndex=0;
    showSongList($('song-search').value);renderLyrics();
  }
  function renderLyrics(){
    const hasLyrics=parsedLyrics.length>0, timed=lyricsTimed();
    $('lyric-placeholder').hidden=hasLyrics;
    $('lyric-lines').hidden=!hasLyrics;
    $('timed-controls').hidden=!timed;
    $('line-delay').disabled=timed;
    $('delay-output').textContent=timed?'LRC':$('line-delay').value+'s';
    $('lyric-mode-tag').textContent=demoActive?'DEMO · Original sample, not Ed Sheeran lyrics':timed?'SYNCED .LRC · Tap a line to resync':hasLyrics?'MANUAL LYRICS · Use arrows or auto-scroll':'NO LYRICS STORED · Official video or import';
    const target=$('lyric-lines'); target.replaceChildren();
    parsedLyrics.forEach(({text,chorusStart},i)=>{
      const row=document.createElement('div');
      row.className='lyric-line'+(lineIndex===i?' current':'')+(chorusStart?' chorus':'');
      row.textContent=text;row.style.setProperty('--font-size',$('font-size').value+'px');
      row.addEventListener('click',()=>{
        if(timed)seekLyrics(parsedLyrics[i].time);
        else {lineIndex=i;renderLyrics();}
      });
      target.append(row);
    });
    if(timed)updateTimeline();
    const current=target.children[lineIndex];
    if(current){
      const stage=$('lyric-stage');
      const center=current.offsetTop-stage.offsetTop-stage.clientHeight/2+current.clientHeight/2;
      stage.scrollTo({top:Math.max(0,center),behavior:'smooth'});
    }
  }
  function stopLyrics(){
    if(lyricTimer!==null){clearInterval(lyricTimer);lyricTimer=null;}
    if(lyricFrame!==null){cancelAnimationFrame(lyricFrame);lyricFrame=null;}
    $('play-lyrics').textContent='▶';$('play-lyrics').setAttribute('aria-label','Start auto-advance');
  }
  function advanceLyrics(delta){
    if(!parsedLyrics.length){toast('Use an official lyric video or import permitted lyrics first.');return;}
    lineIndex=Math.max(0,Math.min(parsedLyrics.length-1,lineIndex+delta));
    if(lyricsTimed()){
      lyricElapsed=parsedLyrics[lineIndex].time;
      lyricClockStart=performance.now()-lyricElapsed*1000;
    }
    renderLyrics();
    if(!lyricsTimed()&&lineIndex===parsedLyrics.length-1&&delta>0)stopLyrics();
  }
  function startLyrics(){
    if(!parsedLyrics.length){$('lyric-editor').hidden=false;toast('Open an official lyric video or import permitted lyrics first.');return;}
    if(lyricsTimed()){
      if(lyricElapsed>=songEnd()-1)seekLyrics(0);
      lyricClockStart=performance.now()-lyricElapsed*1000;
      lastClockDraw=0;
      const step=(now)=>{
        lyricElapsed=Math.max(0,(now-lyricClockStart)/1000);
        const nextIndex=closestTimedIndex(lyricElapsed);
        if(nextIndex!==lineIndex){lineIndex=nextIndex;renderLyrics();}
        if(now-lastClockDraw>200){updateTimeline();lastClockDraw=now;}
        if(lyricElapsed>=songEnd()){lyricElapsed=songEnd();stopLyrics();updateTimeline();return;}
        lyricFrame=requestAnimationFrame(step);
      };
      lyricFrame=requestAnimationFrame(step);
    }else{
      if(lineIndex>=parsedLyrics.length-1)lineIndex=0;
      const delay=Number($('line-delay').value)*1000;
      lyricTimer=setInterval(()=>advanceLyrics(1),delay);
    }
    $('play-lyrics').textContent='Ⅱ';$('play-lyrics').setAttribute('aria-label','Pause auto-advance');renderLyrics();
  }
  $('song-search').addEventListener('input',event=>showSongList(event.target.value));
  $('previous-line').addEventListener('click',()=>advanceLyrics(-1));
  $('next-line').addEventListener('click',()=>advanceLyrics(1));
  $('play-lyrics').addEventListener('click',()=>lyricTimer===null&&lyricFrame===null?startLyrics():stopLyrics());
  $('jump-chorus').addEventListener('click',()=>{
    const starts=parsedLyrics.map((r,i)=>r.chorusStart?i:-1).filter(i=>i>=0);
    if(!starts.length){toast('Add [chorus] above a chorus to enable this jump.');return;}
    const index=starts.find(i=>i>lineIndex)??starts[0];
    if(lyricsTimed())seekLyrics(parsedLyrics[index].time);
    else{lineIndex=index;renderLyrics();}
  });
  function toggleEditor(){$('lyric-editor').hidden=!$('lyric-editor').hidden;if(!$('lyric-editor').hidden)$('lyric-input').focus();}
  $('toggle-editor').addEventListener('click',toggleEditor);
  $('empty-edit').addEventListener('click',toggleEditor);
  $('save-lyrics').addEventListener('click',()=>{
    const input=$('lyric-input').value.slice(0,100000);
    if(!safeSet(lyricsKey(song),input))return;
    parsedLyrics=parseLyrics(input);demoActive=false;lineIndex=0;lyricElapsed=0;
    stopLyrics();renderLyrics();$('lyric-editor').hidden=true;showSongList($('song-search').value);
    toast('Lyrics saved privately on this device.');
  });
  $('clear-lyrics').addEventListener('click',()=>{
    $('lyric-input').value='';safeSet(lyricsKey(song),'');parsedLyrics=[];demoActive=false;lyricElapsed=0;
    stopLyrics();renderLyrics();showSongList($('song-search').value);toast('Lyrics cleared for this song.');
  });
  $('font-size').addEventListener('input',renderLyrics);
  $('line-delay').addEventListener('input',()=>{
    $('delay-output').textContent=$('line-delay').value+'s';
    if(lyricTimer!==null){stopLyrics();startLyrics();}
  });
  $('timed-seek').addEventListener('input',event=>seekLyrics(Number(event.target.value)));
  $('timed-back').addEventListener('click',()=>seekLyrics(lyricElapsed-3));
  $('timed-forward').addEventListener('click',()=>seekLyrics(lyricElapsed+3));
  $('try-demo').addEventListener('click',()=>{
    stopLyrics();demoActive=true;parsedLyrics=parseLyrics(DEMO_LYRICS);lineIndex=0;lyricElapsed=0;
    renderLyrics();toast('Original sample loaded. Try Play, next line or Jump to chorus.');
  });
  $('import-lyrics-button').addEventListener('click',()=>$('lyrics-upload').click());
  $('lyrics-upload').addEventListener('change',async(event)=>{
    const files=[...(event.target.files||[])];
    if(!files.length)return;
    let loaded=0,skipped=0,firstSong=null;
    for(const file of files){
      if(!/\.(txt|lrc)$/i.test(file.name)||file.size>200000){skipped++;continue;}
      const stem=normalizedName(file.name.replace(/\.(txt|lrc)$/i,'').replace(/^ed\s*sheeran[\s_-]*/i,''));
      const matches=SONGS.filter(name=>normalizedName(name)===stem);
      const match=matches[0]||(files.length===1?song:null);
      if(!match){skipped++;continue;}
      const content=(await file.text()).slice(0,100000);
      if(!parseLyrics(content).length||!safeSet(lyricsKey(match),content)){skipped++;continue;}
      loaded++;firstSong??=match;
    }
    event.target.value='';
    if(firstSong)selectSong(firstSong);
    toast(loaded?`${loaded} song${loaded===1?'':'s'} imported locally${skipped?' · '+skipped+' skipped':''}.`:'No valid text or timed lyric file found.');
  });

  // Speech-to-text cue assist: NOT fingerprint-based song recognition.
  let recognition = null;
  let recognitionActive = false;
  let suggestedSong = '';
  const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  function stopRecognition() {
    recognitionActive = false;
    if (recognition) { try { recognition.stop(); } catch {} }
    $('listen-button').textContent = 'Try it';
    $('listen-status').textContent = 'Off · Your microphone is not being used.';
  }
  $('listen-button').addEventListener('click', () => {
    if (recognitionActive) { stopRecognition(); return; }
    if (!SpeechAPI) { toast('Audio-cue assist is unsupported in this browser. Use the song selector.'); return; }
    try {
      recognition = new SpeechAPI(); recognition.lang = 'en-US'; recognition.continuous = true; recognition.interimResults = false;
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
          const found = SONGS.find((name) => transcript.includes(name.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ')));
          if (found && found !== song) {
            suggestedSong = found;
            $('suggestion-copy').textContent = 'Did you hear “' + found + '”?';
            $('song-suggestion').hidden = false;
            stopRecognition(); break;
          }
        }
      };
      recognition.onerror = (event) => { stopRecognition(); $('listen-status').textContent = 'Stopped: ' + event.error + '. Use manual selection.'; };
      recognition.onend = () => { recognitionActive = false; $('listen-button').textContent = 'Try it'; };
      recognition.start(); recognitionActive = true;
      $('listen-button').textContent = 'Stop'; $('listen-status').textContent = 'Listening for spoken song titles · Browser speech services may process audio remotely.';
    } catch { stopRecognition(); toast('Microphone access unavailable. Use manual selection.'); }
  });
  $('accept-suggestion').addEventListener('click', () => { selectSong(suggestedSong); $('song-suggestion').hidden = true; });
  $('reject-suggestion').addEventListener('click', () => { $('song-suggestion').hidden = true; });

  // SETLIST BINGO, stored locally.
  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i],copy[j]] = [copy[j],copy[i]]; }
    return copy;
  };
  function newBingo() {
    const card = shuffle(SONGS).slice(0,24); card.splice(12,0,'FREE SPACE');
    return { card, marks:[] };
  }
  let bingo = safeGet('bingo', null);
  if (!bingo || !Array.isArray(bingo.card) || bingo.card.length !== 25 || !Array.isArray(bingo.marks)) bingo = newBingo();
  function bingoLines() {
    const arr = [];
    for (let i=0;i<5;i++) {
      arr.push([...Array(5)].map((_,j)=>i*5+j));
      arr.push([...Array(5)].map((_,j)=>j*5+i));
    }
    arr.push([0,6,12,18,24],[4,8,12,16,20]);
    return arr;
  }
  function renderBingo() {
    const grid = $('bingo-grid'); grid.replaceChildren();
    bingo.card.forEach((name, i) => {
      const marked = i === 12 || bingo.marks.includes(i);
      const button = document.createElement('button'); button.type='button';
      button.className = 'bingo-cell' + (marked ? ' checked':'') + (i===12?' free':'');
      button.textContent = name; button.setAttribute('aria-pressed',String(marked));
      button.disabled = i===12;
      button.addEventListener('click', () => {
        bingo.marks = bingo.marks.includes(i) ? bingo.marks.filter(x=>x!==i) : [...bingo.marks,i];
        safeSet('bingo',bingo); renderBingo();
      });
      grid.append(button);
    });
    $('bingo-count').textContent = bingo.marks.length + ' / 24';
    const wins = bingoLines().filter(line => line.every(i => i === 12 || bingo.marks.includes(i))).length;
    $('bingo-message').textContent = wins ? '✦ BINGO! ' + wins + ' complete line' + (wins===1?'':'s') + '. You did it!' : 'Your card is ready. Let the show begin!';
  }
  $('regenerate-bingo').addEventListener('click', () => {
    if (bingo.marks.length && !window.confirm('Generate a fresh card and lose your current marks?')) return;
    bingo = newBingo(); safeSet('bingo',bingo); renderBingo(); toast('Your new card is ready!');
  });
  $('reset-bingo').addEventListener('click', () => { bingo.marks=[]; safeSet('bingo',bingo); renderBingo(); toast('All bingo marks cleared.'); });

  // AUDIO SYNTHESIZER, no samples or external service.
  const layers = {kick:true,clap:true,hat:true,melody:false};
  let audioCtx = null, master = null, loopInterval = null, step = 0;
  const beats = $('beat-grid');
  for (let i=0;i<16;i++) { const dot=document.createElement('span'); dot.className='beat-dot'; dot.setAttribute('aria-hidden','true'); beats.append(dot); }
  function newAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { toast('Your browser does not support audio synthesis.'); return false; }
    if (!audioCtx) { audioCtx = new AC(); master = audioCtx.createGain(); master.gain.value = 0.18; master.connect(audioCtx.destination); }
    return true;
  }
  function tone(freq,seconds,kind='sine',volume=.3,endFrequency=null) {
    const osc=audioCtx.createOscillator(), gain=audioCtx.createGain(), now=audioCtx.currentTime;
    osc.type=kind; osc.frequency.setValueAtTime(freq,now);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency,now+seconds);
    gain.gain.setValueAtTime(volume,now); gain.gain.exponentialRampToValueAtTime(.001,now+seconds);
    osc.connect(gain); gain.connect(master); osc.start(now); osc.stop(now+seconds+.01);
  }
  function noise(seconds,volume,highpass=0) {
    const count=Math.max(1,Math.floor(audioCtx.sampleRate*seconds)), buffer=audioCtx.createBuffer(1,count,audioCtx.sampleRate);
    const channel=buffer.getChannelData(0); for(let i=0;i<count;i++) channel[i]=(Math.random()*2-1);
    const source=audioCtx.createBufferSource(),gain=audioCtx.createGain(),now=audioCtx.currentTime;
    source.buffer=buffer; gain.gain.setValueAtTime(volume,now); gain.gain.exponentialRampToValueAtTime(.001,now+seconds);
    if (highpass) {const filter=audioCtx.createBiquadFilter();filter.type='highpass';filter.frequency.value=highpass;source.connect(filter);filter.connect(gain);} else source.connect(gain);
    gain.connect(master);source.start(now);source.stop(now+seconds);
  }
  function playStep() {
    if (!audioCtx) return;
    const i=step;
    if (layers.kick && (i===0 || i===4 || i===8 || i===12)) tone(150,.17,'sine',.85,42);
    if (layers.clap && (i===4 || i===12)) noise(.14,.34,1300);
    if (layers.hat && i%2===0) noise(.046,.20,4500);
    const melodyNotes=[0,null,4,null,7,null,4,null,9,null,7,null,4,null,2,null];
    if (layers.melody && melodyNotes[i] !== null) tone(261.63*Math.pow(2,melodyNotes[i]/12),.24,'triangle',.29);
    $$('.beat-dot').forEach((dot,j) => dot.classList.toggle('now',j===i));
    step=(step+1)%16;
  }
  function stopLoop() {
    if (loopInterval !== null) {clearInterval(loopInterval);loopInterval=null;}
    $('loop-circles').classList.remove('playing'); $('loop-status').textContent='● STOPPED';
    $('loop-play').textContent='▶ Play your loop';
    $$('.beat-dot').forEach(dot=>dot.classList.remove('now'));
  }
  async function startLoop() {
    if (!newAudio()) return;
    try { await audioCtx.resume(); } catch {toast('Tap play again to enable sound.');return;}
    step=0; playStep();
    loopInterval=setInterval(playStep,60000/Number($('tempo').value)/4);
    $('loop-circles').classList.add('playing'); $('loop-status').textContent='● PLAYING';
    $('loop-play').textContent='Ⅱ Pause your loop';
  }
  $('loop-play').addEventListener('click', () => { if(loopInterval!==null) stopLoop(); else startLoop(); });
  $$('.pad').forEach((pad) => pad.addEventListener('click', () => {
    const name = pad.dataset.layer; layers[name]=!layers[name];
    pad.classList.toggle('enabled',layers[name]); pad.setAttribute('aria-pressed',String(layers[name]));
  }));
  $('tempo').addEventListener('input', () => {
    $('tempo-display').textContent=$('tempo').value;
    if (loopInterval!==null) { clearInterval(loopInterval); loopInterval=setInterval(playStep,60000/Number($('tempo').value)/4); }
  });

  // PERSONAL MEMORY CARD; exports only through a local canvas.
  const remembered = safeGet('memory', {}) || {};
  const fields = {'memory-name':'name','memory-venue':'venue','memory-song':'song','memory-note':'note'};
  const select = $('memory-song');
  SONGS.forEach((name) => { const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option); });
  select.value = SONGS.includes(remembered.song) ? remembered.song : 'Perfect';
  $('memory-name').value = remembered.name || '';
  $('memory-venue').value = remembered.venue ?? 'AT&T Stadium · Arlington, TX';
  $('memory-note').value = remembered.note || '';
  let photoImage = null;
  function updateMemory() {
    const data = Object.fromEntries(Object.entries(fields).map(([id,name]) => [name,$(id).value]));
    safeSet('memory',data);
    schedulePreview();
  }
  Object.keys(fields).forEach((id)=> $(id).addEventListener('input',updateMemory));
  $('memory-photo').addEventListener('change',async(event)=>{
    const file=event.target.files?.[0]; photoImage=null; schedulePreview();
    if (!file) {$('photo-status').textContent='No photo selected. Photos are never uploaded.';return;}
    if (file.size > 15*1024*1024) {toast('Choose a photo smaller than 15 MB.');event.target.value='';return;}
    if (!/^image\//.test(file.type)) {toast('Please select an image.');return;}
    const url=URL.createObjectURL(file);
    try {const img=new Image();img.src=url;await img.decode();photoImage=img;schedulePreview();$('photo-status').textContent='Photo ready · Preview and download now include your picture.';}
    catch {$('photo-status').textContent='This photo format is not supported by your browser. Try JPG or PNG.';schedulePreview();}
    finally { if(!photoImage) URL.revokeObjectURL(url); else photoImage.onload=null; }
  });
  function roundRect(ctx,x,y,w,h,r) {ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function drawFitted(ctx,text,x,y,maxWidth,fontSize,fontWeight='700',color='#ffffff') {
    ctx.fillStyle=color; let size=fontSize; ctx.font=fontWeight+' '+size+'px Arial, sans-serif';
    while(ctx.measureText(text).width>maxWidth && size>21) {size-=2;ctx.font=fontWeight+' '+size+'px Arial, sans-serif';}
    ctx.fillText(text,x,y,maxWidth);
  }
  function wrapText(ctx,text,x,y,width,maxLines=3,lineHeight=40) {
    const words=text.split(/\s+/).filter(Boolean);let line='',lines=[];
    for (const word of words) {const candidate=line?line+' '+word:word;if(ctx.measureText(candidate).width>width && line){lines.push(line);line=word;}else line=candidate;}
    if(line)lines.push(line);
    lines.slice(0,maxLines).forEach((item,i)=> ctx.fillText(i===maxLines-1 && lines.length>maxLines ? item+'…':item,x,y+i*lineHeight));
  }
  // Souvenir look: adjust these four values to fine-tune the design.
  const SOUVENIR_ART_OPACITY = 0.15;       // Circle rings + heart: 0 = invisible, 1 = fully visible.
  const SOUVENIR_PHOTO_OPACITY = 0.80;     // Uploaded photo visibility.
  const SOUVENIR_TOUR_PINK = '#D73F82';   // Dominant pink sampled from the Loop Tour poster.
  const SOUVENIR_PINK_OVERLAY_OPACITY = 0.34; // Pink tint over the ENTIRE uploaded photo.
  const SOUVENIR_TOUR_POSTER_OPACITY = 0.55;  // Maximum poster visibility in the lower half.
  // Both photos are blended with gradual transparency masks, not hard-edged crops.
  // Draw to the on-page preview canvas AND the exported PNG from one shared renderer.
  async function drawCard(canvas) {
    const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Canvas unavailable');
    let bg=ctx.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,'#221b48');bg.addColorStop(.45,'#8b437d');bg.addColorStop(1,'#18182d');ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1350);
    if(photoImage) {
      // Compose the visitor's image offscreen and soften its lower edge so the
      // Loop Tour art can emerge naturally underneath, without a visible seam.
      const photoY=50, photoHeight=900;
      const photoLayer=document.createElement('canvas');
      photoLayer.width=1080; photoLayer.height=photoHeight;
      const photoCtx=photoLayer.getContext('2d');
      const scale=Math.max(1080/photoImage.width,photoHeight/photoImage.height);
      const w=photoImage.width*scale, h=photoImage.height*scale;
      photoCtx.drawImage(photoImage,(1080-w)/2,(photoHeight-h)/2,w,h);
      photoCtx.fillStyle=SOUVENIR_TOUR_PINK;
      photoCtx.globalAlpha=SOUVENIR_PINK_OVERLAY_OPACITY;
      photoCtx.fillRect(0,0,1080,photoHeight);
      // Alpha mask: retain the face and upper photo; dissolve its bottom edge.
      photoCtx.globalAlpha=1;
      photoCtx.globalCompositeOperation='destination-in';
      const photoMask=photoCtx.createLinearGradient(0,0,0,photoHeight);
      photoMask.addColorStop(0,'rgba(0,0,0,.85)');
      photoMask.addColorStop(.12,'rgba(0,0,0,1)');
      photoMask.addColorStop(.67,'rgba(0,0,0,1)');
      photoMask.addColorStop(.82,'rgba(0,0,0,.70)');
      photoMask.addColorStop(1,'rgba(0,0,0,0)');
      photoCtx.fillStyle=photoMask;
      photoCtx.fillRect(0,0,1080,photoHeight);
      ctx.save(); ctx.globalAlpha=SOUVENIR_PHOTO_OPACITY;
      ctx.drawImage(photoLayer,0,photoY); ctx.restore();
    }
    const bloom=ctx.createRadialGradient(540,430,40,540,430,510);bloom.addColorStop(0,photoImage ? '#ff8bae30' : '#ff8bae77');bloom.addColorStop(1,'#ff8bae00');ctx.fillStyle=bloom;ctx.fillRect(0,0,1080,1000);
    if (!loopTourPoster) await loopTourPosterReady;
    // Gentle pink color bridge underneath the artwork: the tour image blends
    // into the photograph's pink filter rather than appearing as a pasted block.
    const bridge=ctx.createLinearGradient(0,590,0,1260);
    bridge.addColorStop(0,SOUVENIR_TOUR_PINK + '00');
    bridge.addColorStop(.52,SOUVENIR_TOUR_PINK + '21');
    bridge.addColorStop(1,SOUVENIR_TOUR_PINK + '12');
    ctx.fillStyle=bridge; ctx.fillRect(0,590,1080,760);
    if(loopTourPoster) {
      // Image occupies the lower half, but its top is gradually revealed across
      // 300+ pixels using an alpha mask, with NO hard crop at its top edge.
      const posterY=655, posterH=695;
      const posterLayer=document.createElement('canvas');
      posterLayer.width=1080; posterLayer.height=posterH;
      const posterCtx=posterLayer.getContext('2d');
      const scale=Math.max(1080/loopTourPoster.width,posterH/loopTourPoster.height);
      const w=loopTourPoster.width*scale, h=loopTourPoster.height*scale;
      posterCtx.drawImage(loopTourPoster,(1080-w)/2,(posterH-h)/2,w,h);
      posterCtx.globalCompositeOperation='destination-in';
      const posterMask=posterCtx.createLinearGradient(0,0,0,posterH);
      posterMask.addColorStop(0,'rgba(0,0,0,0)');
      posterMask.addColorStop(.16,'rgba(0,0,0,.05)');
      posterMask.addColorStop(.34,'rgba(0,0,0,.26)');
      posterMask.addColorStop(.54,'rgba(0,0,0,.70)');
      posterMask.addColorStop(.74,'rgba(0,0,0,1)');
      posterMask.addColorStop(1,'rgba(0,0,0,1)');
      posterCtx.fillStyle=posterMask;
      posterCtx.fillRect(0,0,1080,posterH);
      ctx.save();ctx.globalAlpha=SOUVENIR_TOUR_POSTER_OPACITY;
      ctx.drawImage(posterLayer,0,posterY);ctx.restore();
    }
    // A subtle darker foundation keeps white souvenir lettering legible.
    const typeContrast=ctx.createLinearGradient(0,770,0,1350);
    typeContrast.addColorStop(0,'rgba(19,15,36,0)');
    typeContrast.addColorStop(.65,'rgba(19,15,36,.16)');
    typeContrast.addColorStop(1,'rgba(19,15,36,.28)');
    ctx.fillStyle=typeContrast;ctx.fillRect(0,770,1080,580);
    ctx.save(); ctx.globalAlpha=SOUVENIR_ART_OPACITY; // Change the constant above to adjust rings + heart.
    for(const [radius,color,width] of [[295,'#ff9abcbb',43],[212,'#ffc19dcc',34],[128,'#c59dffbb',27]]){ctx.beginPath();ctx.arc(540,425,radius,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
    ctx.fillStyle='#ffccd3';ctx.textAlign='center';ctx.font='bold 95px Georgia, serif';ctx.fillText('♥',540,457); ctx.restore();
    ctx.textAlign='left';drawFitted(ctx,'LOOP NIGHT',68,86,760,31,'800','#ffe8ea');
    drawFitted(ctx,'24 · 10 · 2026',68,126,450,25,'700','#ffe4df');
    ctx.font='900 155px Arial, sans-serif';ctx.fillStyle='#fff7f6';ctx.fillText('I WAS',67,871);ctx.font='italic 150px Georgia, serif';ctx.fillStyle='#ffd2bd';ctx.fillText('THERE.',66,1016);
    ctx.strokeStyle='#ffffff99';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(70,1055);ctx.lineTo(1010,1055);ctx.stroke();
    const data=Object.fromEntries(Object.entries(fields).map(([id,name])=>[name,$(id).value]));
    drawFitted(ctx,(data.song||'PERFECT').toUpperCase()+' · ED SHEERAN',69,1103,940,30,'800','#ffdee8');
    drawFitted(ctx,(data.venue||'YOUR CONCERT').toUpperCase(),69,1142,940,24,'700','#ffe1e8');
    if(data.note) {ctx.font='italic 24px Georgia, serif';ctx.fillStyle='#ffe7ef';wrapText(ctx,'“'+data.note+'”',69,1184,940,2,29);}
    if(data.name)drawFitted(ctx,'MADE FOR '+data.name.toUpperCase(),69,1294,900,22,'700','#ffdfd8');
  }
  let previewTimer=null;
  function schedulePreview() {
    if(previewTimer!==null) clearTimeout(previewTimer);
    previewTimer=setTimeout(async()=>{
      previewTimer=null;
      try {await drawCard($('memory-preview-canvas'));}
      catch(error) {console.warn('Souvenir preview unavailable:',error);}
    },90);
  }
  async function makeCard() {
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
    await drawCard(canvas);
    return new Promise((resolve,reject)=>canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error('Card export failed')),'image/png'));
  }
  function saveBlob(blob,name) {const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  $('download-memory').addEventListener('click',async()=> {try {const blob=await makeCard();saveBlob(blob,'loop-night-concert-memory.png');toast('Your souvenir is downloaded!');}catch {toast('Sorry, this browser could not export the card.');}});
  $('share-memory').addEventListener('click',async()=> {
    try {const blob=await makeCard();const file=new File([blob],'loop-night-concert-memory.png',{type:'image/png'});
      if(navigator.canShare?.({files:[file]}) && navigator.share) await navigator.share({files:[file],title:'My Loop Night'});
      else {saveBlob(blob,file.name);toast('Saved as PNG — share it from your photo or downloads app.');}
    }catch(error) {if(error.name!=='AbortError')toast('Sharing is unavailable; try Download instead.');}
  });

  showSongList(); selectSong(song); renderBingo(); updateMemory(); navigate(location.hash.slice(1));
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load',()=> navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
})();
