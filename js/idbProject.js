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
    const dbPromise = idb.open('brinRRstage3', 3, function(upgradeDB) {
      switch (upgradeDB.oldVersion) {
        case 0:
          {
            console.log('Establishing object store for the project');
            upgradeDB.createObjectStore('restaurants', {keyPath: 'id'});
          }
        case 1:
          {
            console.log('Creating Review Object Store');
            const reviewStore = upgradeDB.createObjectStore('reviews', {keyPath: 'id'});
            reviewStore.createIndex('restaurantID', ['restaurant_id', 'createdAt']);
          }
        case 2: 
          {
            console.log('creating the offlineReviews object store');
            const offlineStore = upgradeDB.createObjectStore('offlineReviews', {keyPath: 'deferredAt'});
            offlineStore.createIndex('restaurantID', ['restaurant_id', 'deferredAt']);
          }
      }
    });

  //add restaurants to the database
    function addRestaurants() {
      fetch(DBHelper.DATABASE_RESTAURANT_URL)
      .then(response => response.json())
      .then(function(restaurants) {
        console.log('addedRestaurants pulled from JSON');
        //cache it
        dbPromise.then( (db) => {
          let restaurantValStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants')
            for (const restaurant of restaurants) {
              restaurantValStore.put(restaurant)
            }
        })
        //send the information back out
        callback(null, restaurants);
      }).catch(function (err) {
        dbPromise.then( (db) => {
          console.log('addRestaurants .catch triggered');
          let restaurantValStore = db.transaction('restaurants').objectStore('restaurants')
          return restaurantValStore.getAll();
        })
      })
    }

function addReviews(id, callback) {
  fetch(DBHelper.DATABASE_REVIEW_URL + id)
  .then (response => response.json())
  .then (function(reviews) {
    console.log('successfully pulled review json data')
    // now cache it
    dbPromise.then ( (db) => {
      if (!db) return;

      let reviewValStore = db.transaction('reviews', 'readwrite').objectStore('reviews')
        for (const review of reviews) {
          reviewValStore.put(review)
        }
        callback(null, reviews);
    })
    /*
      Method based on zoom call and review of code with Greg Pawlowski and modeled on
      approach used in his repo: https://github.com/gregpawlowski/mws-restaurant-stage1/blob/master/src/js/dbhelper.js
      */
    .catch(e => {
      // Error fetching, try geting reviews from IDB.
      idbProject.dbPromise.then(db => {
        const tx = db.transaction(['reviews', 'deferredReviews'])
        const revStore = tx.objectStore('reviews').index('restaurantID');
        const deferredStore = tx.objectStore('offlineReviews').index('restaurantID');
        id = parseInt(id);
        // Create range to include only id, the index is a compound index on id + create date
        const range = IDBKeyRange.bound([id], [id+1], true, false);
        Promise.all([revStore.getAll(range), deferredStore.getAll(range)])
          .then(reviews => {
            reviews = [...reviews[0], ...reviews[1]];
            if (!reviews) return callback(`An error occured: ${e.message}`, null);
            if (reviews.length === 0) return callback(null, null);
            callback(null, reviews);
          });
      });
    });
  })
}

    //update the restaurant with favorites
    function updateFavorite(id, newState) {
      const url = DBHelper.DATABASE_RESTAURANT_URL + `/${id}/?is_favorite=${newState}`;
      console.log(url);
      const method = "PUT";
      fetch (url, {method})
        .then(response => response.json())
        .catch(error => console.error("Updating favorite failed"))
        .then(() => {
          console.log('changed');
          dbPromise.then( (db) => {
            let restaurantValStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
              restaurantValStore.get(id)
                .then(restaurant => {
                  console.log(restaurant);
                  restaurant.is_favorite = newState;
                  restaurantValStore.put(restaurant);
                })
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
    function getAll() {
      dbPromise.then(db => {
        return db.transaction('restaurants')
        .objectstore('restaurants').getAll();
      }).then(allObjs => console.log(allObjs));
    }
  
    //send back the promises 
    return {
      dbPromise: (dbPromise),
      addRestaurants: (addRestaurants),
      addReviews: (addReviews),
      updateFavorite: (updateFavorite),
      getByID: (getByID),
      getAll: (getAll)
    };
     
  })();