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
  var dbPromise = idb.open('brin-restaurant-review-stage3', 1, function(upgradeDB) {
    switch (upgradeDB.oldVersion) {
      case 0:
        upgradeDB.createObjectStore('restaurants', {keyPath: 'id'});
        const reviewsStore = upgradeDB.createObjectStore('reviews', {keyPath: 'id'});
        reviewsStore.createIndex('restaurantID', ['restaurant_id', 'createdAt']);
        const deferredStore = upgradeDB.createObjectStore('deferredReviews', {keyPath: 'deferredAt'});
        deferredStore.createIndex('restaurantID', ['restaurant_id', 'deferredAt']);
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
      dbPromise.then(db => { 
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
      return reviews;
    })
  }

  function getReviews(id) {
    return idbProject.dbPromise.then(db => {
      const tx = db.transaction(['reviews', 'deferredReviews'])
      const revStore = tx.objectStore('reviews').index('restaurantID');
      const deferredStore = tx.objectStore('deferredReviews').index('restaurantID');
      id = parseInt(id);
      const range = IDBKeyRange.bound([id], [id+1], true, false);
      return Promise.all([revStore.getAll(range), deferredStore.getAll(range)])
        .then(reviews => {
          reviews =[...reviews[0], ...reviews[1]];
          if (!reviews) return null;
          if (reviews.length === 0) return null;
          return reviews;
        });
    });
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

//update the restaurant with favorites
function updateFavorite(id, newState) {
  const url = DBHelper.DATABASE_URL + `/${id}/?is_favorite=${newState}`;
  const method = "PUT";
  fetch (url, {method})
    .then(response => response.json())
    .catch(error => console.error("Updating favorite failed"))
    .then(() => {
      dbPromise.then( (db) => {
        let restaurantValStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
          restaurantValStore.get(id)
            .then(restaurant => {
              restaurant.is_favorite = newState;
              restaurantValStore.put(restaurant);
            })
      })
    })
}


  //send back the promises 
  return {
    dbPromise: (dbPromise),
    addRestaurants: (addRestaurants),
    getByID: (getByID),
    getRestaurantsAll: (getRestaurantsAll),
    saveReviews: (saveReviews),
    getReviews: (getReviews),
    updateFavorite: (updateFavorite)   
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
      .then(idbProject.saveReviews); // Greg: Had to change this logic and take the catch out.
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
      fetch(DBHelper.DATABASE_URL)
      .then(function(response) {
        //get from URL
        return response.json();
      }).then(function(returnRestaurants) {
        //get the array
        const restaurants = returnRestaurants;
        callback(null, restaurants);
        //no error, return the restaurants
      })
      .catch(function(error) {
        callback(error, null);
      })
    }
  };

  /*
   * Fetch a restaurant by its ID.
   * Based on information garnered from the Udacity Course on IDB featuring Wittr
   * and conversations with project coach Doug Brown
   * Functionality adjusted and streamlined through coding coaching with Doug Brown
   * and Greg Pawlowski. Structure suggested and outlined through conversations and
   * code alongs in order to fold in proper techniques to existing techniques from 
   * a more informed/skilled perspective.    
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    const restaurant = idbProject.getByID(id);
    restaurant.then(function(restaurantObject) {
      if (restaurantObject) {
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
              callback(null, restaurant);
            } else { // Restaurant does not exist in the database
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

  static submitDeferred() {
    idbProject.dbPromise.then( db => {
      const store =  db.transaction('deferredReviews').objectStore('deferredReviews');
      const submittedRes = {};
      store.getAll()
      .then( revs => {
        if (revs.length === 0) return;
        return Promise.all(revs.map( rev => {
          return fetch(`http://localhost:1337/reviews`, {
            method: 'POST',
            body: JSON.stringify({
              restaurant_id: rev.restaurant_id,
              name: rev.name,
              createdAt: rev.deferredAt,
              rating: rev.rating,
              comments: rev.comments
            })
          })
          .then(response => {
            if (!response.ok) {
              throw Error(response.statusText);
            }
            return response.json();
          })
          .then(json => {
            if (rev.restaurant_name in submittedRes) {
              submittedRes[rev.restaurant_name] = submittedRes[rev.restaurant_name] + 1;
            } else {
              submittedRes[rev.restaurant_name] = 1;
            }
            return json;
          });
        }));
      })
      .then((serverRevs) => {
          if (!serverRevs) return;
          if (Object.keys(submittedRes).length === 0) return;
          const store =  db.transaction('deferredReviews', 'readwrite').objectStore('deferredReviews');
          store.clear();
        });
    });
}

//end of dbhelper
}