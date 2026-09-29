const CACHE_NAME = "johar-hub-cache";


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", event => {

    console.log("[JH SW] Installing...");

    // New service worker immediately active ho
    self.skipWaiting();

});


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", event => {

    event.waitUntil(

        Promise.all([

            // Purane Johar Hub caches delete
            caches.keys().then(cacheNames => {

                return Promise.all(

                    cacheNames
                        .filter(name =>
                            name.startsWith("johar-hub-") &&
                            name !== CACHE_NAME
                        )
                        .map(name =>
                            caches.delete(name)
                        )

                );

            }),

            // Existing tabs ko immediately control karo
            self.clients.claim()

        ])

    );

});


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", event => {

    const request = event.request;

    // Sirf GET requests
    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    // Sirf apni website ke files handle karo
    if (url.origin !== self.location.origin) {
        return;
    }


    event.respondWith(

        caches.open(CACHE_NAME).then(async cache => {

            const cachedResponse =
                await cache.match(request);


            /* =================================================
               BACKGROUND UPDATE
               ================================================= */

            const networkUpdate = fetch(request, {
                cache: "no-store"
            })

            .then(networkResponse => {

                if (
                    networkResponse &&
                    networkResponse.ok
                ) {

                    // Latest file automatically cache replace
                    cache.put(
                        request,
                        networkResponse.clone()
                    );

                }

                return networkResponse;

            })

            .catch(() => {

                return null;

            });


            /* =================================================
               CACHE AVAILABLE
               → TURANT CACHE DIKHAO
               → NETWORK BACKGROUND MEIN UPDATE KARE
               ================================================= */

            if (cachedResponse) {

                return cachedResponse;

            }


            /* =================================================
               CACHE NAHI HAI
               → NETWORK KA WAIT
               ================================================= */

            const freshResponse =
                await networkUpdate;

            if (freshResponse) {

                return freshResponse;

            }


            // Completely offline + uncached
            return new Response(
                "Offline",
                {
                    status: 503,
                    headers: {
                        "Content-Type":
                            "text/plain"
                    }
                }
            );

        })

    );

});