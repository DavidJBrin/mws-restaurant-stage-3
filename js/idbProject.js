/* 
 Included idb.js as a local file and included the building of the database in the dbhelper file rather than the service worker. While this isn't ideal for production,
 it was the easiest method for me to follow.
 The following resources were consulted to help build the database creation code:
 https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 https://developers.google.com/web/ilt/pwa/working-with-indexeddb
 */

var idbProject = (function() {
    'use strict';
  
    //is indexedDB supported; if not throw an error
    if(!('indexedDB' in window)) {
      console.log('indexedDB not supported in this browser');
      return;
    }
  
    // initiate DB magic and mumbojumbo
    var dbPromise = idb.open('brin-restaurant-review-stage2', 1, function(upgradeDB) {
      switch (upgradeDB.oldVersion) {
        case 0:
        case 1:
          console.log('Establishing object store for the project');
          upgradeDB.createObjectStore('restaurants', {keyPath: 'id'});
      }
    });
  
  
    function addRestaurants() {
      fetch(DBHelper.DATABASE_URL)
      .then(response => response.json())
      .then(function(restaurants) {
        console.log('Add restaurant to cache: ', restaurants);
        return dbPromise.then((db) => {
          let restaurantValStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants')
            for (const restaurant of restaurants) {
              console.log('added restaurant: ', restaurant);
              restaurantValStore.put(restaurant)
            }
        })
        //send the information back out
        callback(null, restaurants);
      }).catch(function (err) {
        return dbPromise.then( (db) => {
          console.log('catch err triggered');
          let restaurantValStore = db.transaction('restaurants').objectStore('restaurants')
          return restaurantValStore.getAll();
        })
      })
    }
  
    //get the restaurants using the id field for the identifier
    function getByID(id) {
      return dbPromise.then(function(db) {
        const txtion = db.transaction('restaurants', 'readonly');
        const store = txtion.objectStore('restaurants');
        return store.get(parseInt(id));
      }).then(function(restaurantObject) {
        return restaurantObject;
      }).catch(function(z) {
        console.log('Fetch Function errored out:', z);
      });
    }
  
    //retrieve the restaurants like a champ
    function getRestaurantsAll() {
      dbPromise.then(db => {
        return db.transaction('restaurants').objectstore('restaurants')
        .getRestaurantsAll();
      }).then(allObjs => console.log(allObjs));
    }
  
    //send back the promises 
    return {
      dbPromise: (dbPromise),
      addRestaurants: (addRestaurants),
      getByID: (getByID),
      getRestaurantsAll: (getRestaurantsAll)
    };
     
  })();