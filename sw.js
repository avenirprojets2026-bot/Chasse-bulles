// Met tout le jeu en cache pour jouer hors ligne ; une nouvelle version remplace l'ancienne automatiquement
const CACHE='chasse-bulles-1afd5a19';
const FILES=["./", "index.html", "audio.js", "manifest.webmanifest", "assets/bg.webp", "assets/bg2.webp", "assets/bg3.webp", "assets/bg4.webp", "assets/bg5.webp", "assets/boss1.webp", "assets/boss2.webp", "assets/boss3.webp", "assets/boss4.webp", "assets/boss5.webp", "assets/bubbles.webp", "assets/dracula.webp", "assets/fantome.webp", "assets/frank.webp", "assets/logo.webp", "assets/loup.webp", "assets/momie.webp", "assets/platform.webp", "assets/platform2.webp", "assets/platform3.webp", "assets/platform4.webp", "assets/platform5.webp", "assets/sorciere.webp", "assets/squelette.webp", "assets/zombie.webp", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(res=>{
    if(res.ok&&(e.request.url.startsWith(self.location.origin)||e.request.url.includes('fonts.g'))){const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}
    return res}).catch(()=>caches.match('index.html'))));
});
