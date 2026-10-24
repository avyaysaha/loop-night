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
  let lyricTimer = null;
  const lyricsKey = (name) => 'lyrics:' + name;
  function showSongList(filter = '') {
    const query = filter.trim().toLowerCase();
    const list = $('song-list'); list.replaceChildren();
    const matches = SONGS.filter((name) => name.toLowerCase().includes(query));
    if (!matches.length) {
      const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No matching songs.'; list.append(p); return;
    }
    matches.forEach((name) => {
      const item = document.createElement('button'); item.type = 'button';
      item.className = 'song-option' + (song === name ? ' active' : '');
      item.setAttribute('aria-pressed', String(song === name));
      const label = document.createElement('span'); label.textContent = String(SONGS.indexOf(name) + 1).padStart(2, '0');
      item.append(document.createTextNode(name), label);
      item.addEventListener('click', () => selectSong(name)); list.append(item);
    });
  }
  function parseLyrics(source) {
    let isChorus = false;
    return source.split(/\r?\n/).map((line) => line.trim()).flatMap((line) => {
      if (/^\[chorus\]$/i.test(line)) { isChorus = true; return []; }
      if (/^\[(verse|bridge|intro|outro|pre-chorus|instrumental)(?:\s*\d+)?\]$/i.test(line)) { isChorus = false; return []; }
      if (!line) return [];
      const result = { text:line, chorusStart:isChorus };
      isChorus = false;
      return [result];
    });
  }
  function selectSong(next) {
    if (!SONGS.includes(next)) return;
    stopLyrics(); song = next; safeSet('song', song);
    $('now-song').textContent = song;
    $('lyric-video-link').href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent('Ed Sheeran ' + song + ' official lyric video');
    $('lyric-editor').hidden = true;
    $('lyric-input').value = safeGet(lyricsKey(song), '') || '';
    parsedLyrics = parseLyrics($('lyric-input').value);
    lineIndex = 0; showSongList($('song-search').value); renderLyrics();
  }
  function renderLyrics() {
    $('lyric-placeholder').hidden = parsedLyrics.length > 0;
    const target = $('lyric-lines'); target.hidden = !parsedLyrics.length;
    target.replaceChildren();
    parsedLyrics.forEach(({text, chorusStart}, i) => {
      const row = document.createElement('div');
      row.className = 'lyric-line' + (lineIndex === i ? ' current' : '') + (chorusStart ? ' chorus' : '');
      row.textContent = text; row.style.setProperty('--font-size', $('font-size').value + 'px');
      row.addEventListener('click', () => { lineIndex = i; renderLyrics(); });
      target.append(row);
    });
    const current = target.children[lineIndex];
    if (current) current.scrollIntoView({block:'center', behavior:'smooth'});
  }
  function stopLyrics() {
    if (lyricTimer !== null) { clearInterval(lyricTimer); lyricTimer = null; }
    $('play-lyrics').textContent = '▶'; $('play-lyrics').setAttribute('aria-label', 'Start auto-advance');
  }
  function advanceLyrics(delta) {
    if (!parsedLyrics.length) { toast('Add your own permitted lyrics first.'); return; }
    lineIndex = Math.max(0, Math.min(parsedLyrics.length - 1, lineIndex + delta));
    renderLyrics();
    if (lineIndex === parsedLyrics.length - 1 && delta > 0) stopLyrics();
  }
  function startLyrics() {
    if (!parsedLyrics.length) { $('lyric-editor').hidden = false; toast('Add your lyrics to start following along.'); return; }
    if (lineIndex >= parsedLyrics.length - 1) lineIndex = 0;
    const delay = Number($('line-delay').value) * 1000;
    lyricTimer = setInterval(() => advanceLyrics(1), delay);
    $('play-lyrics').textContent = 'Ⅱ'; $('play-lyrics').setAttribute('aria-label', 'Pause auto-advance');
    renderLyrics();
  }
  $('song-search').addEventListener('input', (event) => showSongList(event.target.value));
  $('previous-line').addEventListener('click', () => advanceLyrics(-1));
  $('next-line').addEventListener('click', () => advanceLyrics(1));
  $('play-lyrics').addEventListener('click', () => lyricTimer === null ? startLyrics() : stopLyrics());
  $('jump-chorus').addEventListener('click', () => {
    const starts = parsedLyrics.map((row,i) => row.chorusStart ? i : -1).filter((i) => i >= 0);
    if (!starts.length) { toast('Add [chorus] above a chorus to enable this jump.'); return; }
    lineIndex = starts.find((i) => i > lineIndex) ?? starts[0]; renderLyrics();
  });
  function toggleEditor() { $('lyric-editor').hidden = !$('lyric-editor').hidden; if (!$('lyric-editor').hidden) $('lyric-input').focus(); }
  $('toggle-editor').addEventListener('click', toggleEditor);
  $('empty-edit').addEventListener('click', toggleEditor);
  $('save-lyrics').addEventListener('click', () => {
    const input = $('lyric-input').value.slice(0, 100000);
    if (!safeSet(lyricsKey(song), input)) return;
    parsedLyrics = parseLyrics(input); lineIndex = 0; stopLyrics(); renderLyrics(); $('lyric-editor').hidden = true;
    toast('Lyrics saved privately on this device.');
  });
  $('clear-lyrics').addEventListener('click', () => {
    $('lyric-input').value = ''; safeSet(lyricsKey(song), ''); parsedLyrics = []; stopLyrics(); renderLyrics(); toast('Lyrics cleared for this song.');
  });
  $('font-size').addEventListener('input', renderLyrics);
  $('line-delay').addEventListener('input', () => {
    $('delay-output').textContent = $('line-delay').value + 's';
    if (lyricTimer !== null) { stopLyrics(); startLyrics(); }
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
    $('preview-song').textContent = (data.song + ' · ED SHEERAN').toUpperCase();
    $('preview-venue').textContent = (data.venue || 'YOUR CONCERT').toUpperCase();
  }
  Object.keys(fields).forEach((id)=> $(id).addEventListener('input',updateMemory));
  $('memory-photo').addEventListener('change',async(event)=>{
    const file=event.target.files?.[0]; photoImage=null;
    if (!file) {$('photo-status').textContent='No photo selected. Photos are never uploaded.';return;}
    if (file.size > 15*1024*1024) {toast('Choose a photo smaller than 15 MB.');event.target.value='';return;}
    if (!/^image\//.test(file.type)) {toast('Please select an image.');return;}
    const url=URL.createObjectURL(file);
    try {const img=new Image();img.src=url;await img.decode();photoImage=img;$('photo-status').textContent='Photo ready · It will be included in the downloaded card.';}
    catch {$('photo-status').textContent='This photo format is not supported by your browser. Try JPG or PNG.';}
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
  async function makeCard() {
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
    const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Canvas unavailable');
    let bg=ctx.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,'#221b48');bg.addColorStop(.45,'#8b437d');bg.addColorStop(1,'#18182d');ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1350);
    if(photoImage) {const scale=Math.max(1080/photoImage.width,780/photoImage.height);const w=photoImage.width*scale,h=photoImage.height*scale;ctx.save();ctx.globalAlpha=.55;ctx.drawImage(photoImage,(1080-w)/2,60+(780-h)/2,w,h);ctx.restore();}
    const bloom=ctx.createRadialGradient(540,430,40,540,430,510);bloom.addColorStop(0,'#ff8bae77');bloom.addColorStop(1,'#ff8bae00');ctx.fillStyle=bloom;ctx.fillRect(0,0,1080,1000);
    for(const [radius,color,width] of [[295,'#ff9abcbb',43],[212,'#ffc19dcc',34],[128,'#c59dffbb',27]]){ctx.beginPath();ctx.arc(540,425,radius,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
    ctx.fillStyle='#ffccd3';ctx.textAlign='center';ctx.font='bold 95px Georgia, serif';ctx.fillText('♥',540,457);
    ctx.textAlign='left';drawFitted(ctx,'LOOP NIGHT',68,86,760,31,'800','#ffe8ea');ctx.textAlign='right';drawFitted(ctx,'24 · 10 · 2026',1013,86,450,25,'700','#ffe4df');ctx.textAlign='left';
    ctx.font='900 155px Arial, sans-serif';ctx.fillStyle='#fff7f6';ctx.fillText('I WAS',67,871);ctx.font='italic 150px Georgia, serif';ctx.fillStyle='#ffd2bd';ctx.fillText('THERE.',66,1016);
    ctx.strokeStyle='#ffffff99';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(70,1055);ctx.lineTo(1010,1055);ctx.stroke();
    const data=Object.fromEntries(Object.entries(fields).map(([id,name])=>[name,$(id).value]));
    drawFitted(ctx,(data.song||'PERFECT').toUpperCase()+' · ED SHEERAN',69,1103,940,30,'800','#ffdee8');
    drawFitted(ctx,(data.venue||'YOUR CONCERT').toUpperCase(),69,1142,940,24,'700','#ffe1e8');
    if(data.note) {ctx.font='italic 24px Georgia, serif';ctx.fillStyle='#ffe7ef';wrapText(ctx,'“'+data.note+'”',69,1184,940,2,29);}
    if(data.name)drawFitted(ctx,'MADE FOR '+data.name.toUpperCase(),69,1294,750,22,'700','#ffdfd8');
    ctx.textAlign='right';drawFitted(ctx,'YOUR NIGHT · YOUR SOUNDTRACK',1010,1294,750,19,'700','#ffcbd6');
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
