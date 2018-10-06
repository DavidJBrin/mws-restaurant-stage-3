//The service worker was updated for Stage 2 to reflect caching changes
// Based on information garnered from the Udacity Course on IDB featuring Wittr
//* and conversations with project coach Doug Brown 
/*
   * Fetch a restaurant by its ID.
   * Based on information garnered from the Udacity Course on IDB featuring Wittr
   * and conversations with project coach Doug Brown
   * Functionality adjusted and streamlined through coding coaching with Doug Brown
   * and Greg Pawlowski. Structure suggested and outlined through conversations and
   * code alongs in order to fold in proper techniques to existing techniques from 
   * a more informed/skilled perspective.    
   */
var staticCacheName = 'mws-restaurant-v3';

// create a cache with the below files
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(staticCacheName).then(function(cache) {
            return cache.addAll(
                [
                    './',
                    './index.html',
                    './restaurant.html',
                    './css/styles.css',
                    './js/dbhelper.js',
                    './js/idb.js',
                    './js/main.js',
                    './js/formAction.js',
                    './js/restaurant_info.js',
                    './sw.js',
                    './img/',
                    './manifest.json'
                ]
            );
        })
    );
});


self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheName) {
                    return cacheName.startsWith('mws-restaurant-') &&
                        cacheName != staticCacheName;
                }).map(function(cacheName) {
                    return cache.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', function(event) {
    const reqURL = new URL(event.request.url);
    if (reqURL.port !== '1337') { // Make sure we don't cache any API data from the server. We will be saving it to idb instead
        event.respondWith(
            caches.match(event.request)
                .then(function(response) {
                    if (response) {
                        return response;
                    }
                    //create a response function that puts the item into cache
                    var fetchRequest = event.request.clone();

                    return fetch(fetchRequest).then(
                        function(response) {
                            if(!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                        var responseToCache = response.clone();

                        caches.open(staticCacheName)
                        .then(function(cache) {
                            cache.put(event.request, responseToCache);
                        });
                        return response;
                        }
                    );
                })
            );
    }
});

self.addEventListener('message', function(event){
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});