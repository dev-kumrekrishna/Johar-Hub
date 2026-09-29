/* =========================================================
   JOHAR HUB
   SERVICE WORKER (Valid Lifecycle & Fetch Event)
   ========================================================= */

// 1. Install Event: Jab service worker pehli baar install hota hai
self.addEventListener('install', (event) => {
    console.log("[JH PWA] Service Worker installed");
    self.skipWaiting(); // Naya version turant active karne ke liye
});

// 2. Activate Event: Puraane cache clean karne ya claim karne ke liye
self.addEventListener('activate', (event) => {
    console.log("[JH PWA] Service Worker activated");
    event.waitUntil(self.clients.claim());
});

// 3. Fetch Event: PWA install prompt trigger hone ke liye yeh zaroori hai
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch((error) => {
            console.error("[JH PWA] Fetch failed:", error);
        })
    );
});