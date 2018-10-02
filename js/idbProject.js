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
    var dbPromise = idb.open('brinRRstage3', 3, function(upgradeDB) {
      switch (upgradeDB.oldVersion) {
        case 0:
          {
            console.log('Establishing object store for the project');
            upgradeDB.createObjectStore('restaurants', {keyPath: 'id'});
          }
        case 1:
          {
            console.log('Creating Review Object Store');
            const reviewsStore = upgradeDB.createObjectStore('reviews', {keyPath: 'id'});
            reviewsStore.createIndex('restaurant_id', 'restaurant_id');
          }
        case 2: 
          {
            console.log('creating the offline-pending object store');
            upgradeDB.createObjectStore('pending', {keyPath: 'id', autoIncrement: true});
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

// add reviews to database 
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
    .catch(error => {
      let reviewValStore = db.transaction('reviews', 'restaurant', id)
      .then ((storedReviews) => {
        console.log('getting offline reviews');
        return Promise.resolve(storedReviews);
      })
    })
    })

}


    //update the restaurant with favorites
    function updateRestaurant(id, newState) {
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
  
    //add pending reviews up to the db
    function addPending(url, method, body) {
      dbPromise.then(db => {
        const tx = db.transaction('pending', 'readwrite'); 
        tx
          .objectStore('pending')
          .put({
            data: {
              url,
              method,
              body
            }
          })
      })
    }
    //send back the promises 
    return {
      dbPromise: (dbPromise),
      addRestaurants: (addRestaurants),
      addReviews: (addReviews),
      updateRestaurant: (updateRestaurant),
      getByID: (getByID),
      getAll: (getAll),
      addPending: (addPending)
    };
     
  })();