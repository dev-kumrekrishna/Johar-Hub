/* =========================================================
   JOHAR HUB
   SERVICE WORKER
   NO CACHE
   AUTO UPDATE
   ========================================================= */

self.addEventListener("install", event => {

    console.log("[JH SW] Installing...");

    // New service worker ko immediately activate karne ke liye
    self.skipWaiting();

});


self.addEventListener("activate", event => {

    console.log("[JH SW] Activated...");

    event.waitUntil(
        self.clients.claim()
    );

});


self.addEventListener("fetch", event => {

    const request = event.request;

    // Sirf GET requests
    if (request.method !== "GET") {
        return;
    }

    event.respondWith(

        fetch(request, {
            cache: "no-store"
        })

        .catch(error => {

            console.error(
                "[JH SW] Network request failed:",
                error
            );

            throw error;

        })

    );

});
