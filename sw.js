'use strict';
const CACHE_NAME = 'loop-night-static-v1';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('loop-night-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if(response.ok && new URL(request.url).pathname.startsWith(new URL(self.registration.scope).pathname)) {
      const clone=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,clone)).catch(()=>{});
    }
    return response;
  })));
});
