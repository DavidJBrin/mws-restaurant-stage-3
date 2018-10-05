/**
 * Common database helper functions.
 */

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
    return;
  }

  // initiate DB magic and mumbojumbo
  var dbPromise = idb.open('brin-restaurant-review-stage2', 1, function(upgradeDB) {
    switch (upgradeDB.oldVersion) {
      case 0:
        upgradeDB.createObjectStore('restaurants', {keyPath: 'id'});
        const reviewsStore = upgradeDB.createObjectStore('reviews', {keyPath: 'id'});
        reviewsStore.createIndex('restaurantID', ['restaurant_id', 'createdAt']);
    }
  });

  function addRestaurants(callback) {
    fetch(DBHelper.DATABASE_URL)
    .then(response => {
      if (!response.ok) {
        throw Error(response.statusText);
      }
      return response.json().then((json) => {
        idbProject.dbPromise.then ((db) => {
          if (!db) return;
          
          const tx = db.transaction('restaurants', 'readwrite');
          const store = tx.objectStore('restaurants');
          json.forEach((restaurant) => {
            store.put(restaurant);
          });
        });
        callback(null, json);
      });
    }).catch(e => {
      DBHelper.DBPromised.then(db => {
        const store = db.transaction('restaurants').objectStore('restaurants');

        store.getAll()
          .then(restaurants => {
            if (!restaurants) callback(`Couldn't find restaurants in IDB: ${e.message}`, null);
            callback(null, restaurants);
          });
      });
});
}

  function saveReviews(reviews) {
    return dbPromise.then(db => {
      const tx = db.transaction('reviews', 'readwrite');
      const store = tx.objectStore('reviews');
      reviews.forEach(rev => store.put(rev));
      console.log('reviews pulled from server with saveReviews');
      return reviews;
    })
  }

  function getReviews(reviews) {
    idbProject.dbPromise.then(db => {
      console.log('getReviews offline triggered/accessed');
      const tx = db.transaction('reviews');
      const revStore = tx.objectStore('reviews').index('restaurantID');
      id = parseInt(id);
      const range = IDBKeyRange.bound([id], true, false);
      Promise.all(revStore.getAll(range))
        .then(reviews => {
          reviews =[...reviews[0], ...reviews[1]];
          if (!reviews) return callback(`An error occured: ${e.message}`)
          if (reviews.length === 0) return callback(null)
        })
    })
    console.log('Reviews passed up through getReviews')
    return reviews;
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
    getRestaurantsAll: (getRestaurantsAll),
    saveReviews: (saveReviews),
    getReviews: (getReviews)    
  };
   
})();

class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */

  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static getRestaurantReviews(id) {
    return fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`)
      .then(res => res.json())
      .then(idbProject.saveReviews)
      .catch(e => {
        idbProject.getReviews;
      })
  }
  
  /**
   * Fetch all restaurants.
   * Based on information garnered from the Udacity Course on IDB featuring Wittr
   * and conversations with project coach Doug Brown 
   */
  static fetchRestaurants(callback) {
    idbProject.addRestaurants(callback);
    //if database hasn't populated, pull from server and populate
    if(!restaurants) {
      console.log("Restaurants pulled from server");
      fetch(DBHelper.DATABASE_URL)
      .then(function(response) {
        //get from URL
        return response.json();
      }).then(function(returnRestaurants) {
        //get the array
        const restaurants = returnRestaurants;
        callback(null, restaurants);
        console.log('restaurants cached');
        //no error, return the restaurants
      })
      .catch(function(error) {
        callback(error, null);
        console.log('restaurants not retrieved and not cached?');
      })
    }
  };

  /**
   * Fetch a restaurant by its ID.
   * Based on information garnered from the Udacity Course on IDB featuring Wittr
   * and conversations with project coach Doug Brown    
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    const restaurant = idbProject.getByID(id);
    restaurant.then(function(restaurantObject) {
      if (restaurantObject) {
        console.log("the fetchRestaurantsByID got from Index");
        callback(null, restaurantObject);
        return;
      }
      else {
        DBHelper.fetchRestaurants((error, restaurants) => {
          if (error) {
            callback(error, null);
          } else {
            const restaurant = restaurants.find(r => r.id == id);
            if (restaurant) { // Got the restaurant
              console.log('fetchRestaurantsById from network succeeded');
              callback(null, restaurant);
            } else { // Restaurant does not exist in the database
              console.log('fetchRestaurantsById failed');
              callback('Restaurant does not exist', null);
            }
          }
        });
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    //fix the record with missing id field
    if (restaurant.photograph == undefined)
      restaurant.photograph = restaurant.id;
    return (`/img/${restaurant.photograph}` + ".jpg");
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 
  

}

