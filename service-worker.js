const CACHE_NAME = "johar-hub-cache";

const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/product.html",
    "/profile.html",
    "/manifest.json",
    "/css/style.css",
    "/js/script.js"
];

// ==================================================
// INSTALL
// ==================================================

self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {

                return cache.addAll(STATIC_ASSETS);

            })
    );

    // New service worker ko waiting mein unnecessarily
    // mat rakho
    self.skipWaiting();

});


// ================================
// ACTIVATE
// ================================

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()
            .then(cacheNames => {

                return Promise.all(

                    cacheNames
                        .filter(name =>
                            name.startsWith("johar-hub-") &&
                            name !== CACHE_NAME
                        )
                        .map(name => caches.delete(name))

                );

            })

            .then(() => self.clients.claim())

    );

});


// ================================
// FETCH
// ================================

self.addEventListener("fetch", event => {

    const request = event.request;

    // Sirf GET requests cache hongi
    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    // Sirf same website ki requests
    if (url.origin !== self.location.origin) {
        return;
    }


    // --------------------------------
    // HTML / PAGE NAVIGATION
    // Network First
    // --------------------------------

    if (request.mode === "navigate") {

        event.respondWith(

            fetch(request)
                .then(response => {

                    // Fresh page cache mein save
                    const responseClone = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(request, responseClone);
                        });

                    return response;

                })

                .catch(() => {

                    // Internet nahi hai
                    return caches.match(request)
                        .then(cached => {

                            return cached || caches.match("/index.html");

                        });

                })

        );

        return;
    }


    // --------------------------------
    // CSS / JS / Images / Fonts etc.
    // Stale While Revalidate
    // --------------------------------

    event.respondWith(

        caches.match(request)
            .then(cachedResponse => {

                const networkFetch = fetch(request)
                    .then(networkResponse => {

                        if (
                            networkResponse &&
                            networkResponse.status === 200
                        ) {

                            const responseClone =
                                networkResponse.clone();

                            caches.open(CACHE_NAME)
                                .then(cache => {

                                    cache.put(
                                        request,
                                        responseClone
                                    );

                                });

                        }

                        return networkResponse;

                    })
                    .catch(() => null);


                // Cached hai?
                // Immediately return cached.
                // Network background mein update karta rahega.

                return cachedResponse || networkFetch;

            })

    );

})