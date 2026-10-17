const CACHE='rixu-shell-v1.0.0';
const ASSETS=['./','./index.html','./styles.css','./src/app.js','./src/model.js','./src/store.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('rixu-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const scope=new URL('./',self.location).pathname;if(!url.pathname.startsWith(scope))return;
 if(event.request.mode==='navigate')event.respondWith(caches.match(new URL('./index.html',self.location).href).then(cached=>cached||fetch(event.request)));
 else if(ASSETS.some(path=>new URL(path,self.location).href===url.href))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
