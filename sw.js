/*The service worker was updated for Stage 2 to reflect caching changes
Based on information garnered from the Udacity Course on IDB featuring Wittr
and conversations with project coach Doug Brown;
Reorganized and adjusted for Stage 3 to add new files 
*/
var staticCacheName = 'mws-restaurant-v21';

// create a cache with the above files
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(staticCacheName).then(function(cache) {
            console.log('returning the added cache.addall');
            return cache.addAll(
                [
                    './',
                    './index.html',
                    './restaurant.html',
                    './manifest.json',
                    './css/styles.css',
                    './img/',
                    './icons/',
                    './js/dbhelper.js',
                    './js/idb.js',
                    './js/idbProject.js',
                    './js/main.js',
                    './js/restaurant_info.js',
                    './sw.js'   
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
});

self.addEventListener('message', function(event){
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});