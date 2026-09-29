/* =========================================================
   JOHAR HUB
   SERVICE WORKER
   NO CACHE
   NO OFFLINE STORAGE
   ========================================================= */


self.addEventListener("install", event => {

    console.log("[JH SW] Installed");

    // Immediately activate
    self.skipWaiting();

});


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", event => {

    event.waitUntil(

        Promise.all([

            // Delete ALL existing caches
            caches.keys().then(cacheNames => {

                return Promise.all(
                    cacheNames.map(cacheName =>
                        caches.delete(cacheName)
                    )
                );

            }),

            // Take control immediately
            self.clients.claim()

        ])

    );

});


/* =========================================================
   FETCH
   NO CACHE
   ========================================================= */

self.addEventListener("fetch", event => {

    const request = event.request;

    // Only GET requests
    if (request.method !== "GET") {
        return;
    }

    /*
     * Always go directly to network.
     *
     * cache: "no-store"
     * means browser HTTP cache is also bypassed.
     */

    event.respondWith(

        fetch(request, {
            cache: "no-store"
        })

        .catch(error => {

            console.error(
                "[JH SW] Network request failed:",
                error
            );

            /*
             * No offline fallback.
             * If internet is unavailable,
             * the browser receives the network error.
             */

            throw error;

        })

    );

});