/**
 * Common database helper functions.
 */
const port = 1337; // Change this to your server port
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_RESTAURANT_URL() {
    return `http://localhost:${port}/restaurants`;
  }

  static get DATABASE_REVIEW_URL() {
    console.log('Accessed review url builder');
    return `http://localhost:${port}/reviews/?restaurant_id=`;
  }

  static get DATABASE_ADD_REVIEW_URL() {
    return `http://localhost:${port}/reviews`;
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
      fetch(DBHelper.DATABASE_RESTAURANT_URL)
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
        console.log("the fetchRestaurantsByID got from IndexDB");
        callback(null, restaurantObject);
        return;
      }
      else {
        DBHelper.fetchRestaurants((error, restaurants) => {
          if (error) {
            console.log("error occurring in fetchRestaurantsByID 1st else");
            callback(error, null);
          } else {
            const restaurant = restaurants.find(r => r.id == id);
            if (restaurant) { // Got the restaurant
              console.log('fetchRestaurantsById from network succeeded');
              callback(null, restaurant);
            } else { // Restaurant does not exist in the database
              console.log('fetchRestaurantsById failed Restaurant Does not exist');
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

  static urlForReviewForm(restaurant) {
    return (`./review.html?id=${restaurant.id}`);
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
  
  /*
  Queueing mechanism as explained and demonstrated by Doug Brown 10/2/2018 via private
  chat and in review of 
  https://github.com/thefinitemonkey/udacity-restaurant-reviews/blob/master/app/js/dbhelper.js
  Previous approach was failing to write/add new reviews to the database. Stripped out
  old approach, discussed the mechanisms in place with Brown, and implementated. Names and
  functions have been tweaked to protect the clueless innocent.
  */

  static addPendingRequestToQueue(url, method, body) {
    const dbPromise = idb.open("brinRRstage3");
    dbPromise.then(db => {
      const tx = db.transaction("pending", "readwrite");
      tx
      .objectStore("pending")
      .put({
        data: {
          url,
          method,
          body
        }
     })
  })
  .catch(error=> {})
  .then(DBHelper.nextPending());
  }

  static nextPending() {
    DBHelper.attemptCommitPending(DBHelper.nextPending);
  }

  /*
  Queueing mechanism as explained and demonstrated by Doug Brown 10/2/2018 via private
  chat and in review of 
  https://github.com/thefinitemonkey/udacity-restaurant-reviews/blob/master/app/js/dbhelper.js
  Previous approach was failing to write/add new reviews to the database. Stripped out
  old approach, discussed the mechanisms in place with Brown, and implementated. Names and
  functions have been tweaked to protect the clueless innocent.
  */
  static attemptCommitPending(callback) {
    // Iterate over the pending items until there is a network failure
    let url;
    let method;
    let body;
    dbPromise.then(db => {
      if (!db.objectStoreNames.length) {
        console.log("DB not available");
        db.close();
        return;
      }

      const tx = db.transaction("pending", "readwrite");
      tx
        .objectStore("pending")
        .openCursor()
        .then(cursor => {
          if (!cursor) {
            return;
          }
          const value = cursor.value;
          url = cursor.value.data.url;
          method = cursor.value.data.method;
          body = cursor.value.data.body;

          // If we don't have a parameter then we're on a bad record that should be tossed
          // and then move on
          if ((!url || !method) || (method === "POST" && !body)) {
            cursor
              .delete()
              .then(callback());
            return;
          };

          const properties = {
            body: JSON.stringify(body),
            method: method
          }
          console.log("sending post from queue: ", properties);
          fetch(url, properties)
            .then(response => {
            // If we don't get a good response then assume we're offline
            if (!response.ok && !response.redirected) {
              return;
            }
          })
            .then(() => {
              // Success! Delete the item from the pending queue
              const deltx = db.transaction("pending", "readwrite");
              deltx
                .objectStore("pending")
                .openCursor()
                .then(cursor => {
                  cursor
                    .delete()
                    .then(() => {
                      callback();
                    })
                })
              console.log("deleted pending item from queue");
            })
        })
        .catch(error => {
          console.log("Error reading cursor");
          return;
        })
    })
  }

  static updateCacheRestaurantData(id, updateObj) {
    const dbPromise = idb.open("brinRRstage3");
    dbPromise.then(db => {
      console.log("getting db transaction to move it");
      const tx = db.transaction("restaurants", "readwrite");
      const value = tx
        .objectStore("restaurants")
        .get("-1")
        .then(value => {
          if(!value) {
            console.log("no more cached data found");
            return;
          }
          const data = value.data;
          const restaurantArr = data.filter(r => r.id === id);
          const restaurantObj = restaurantArr[0];
          if(!restaurantObj)
            return;
          const keys = Object.keys(updateObj);
          keys.forEach(k => {
            restaurantObj[k] = updateObj[k];
          })
          dbPromise.tehn(db => {
            const tx = db.transaction("restaurants", "readwrite");
            tx
              .objectStore("restaurant")
              .put({id: "-1", data: data});
            return tx.complete;
          })
        })
    })
    dbPromise.then(db => {
      console.log("getting DB TRANSACTION TO PROCESS");
      const tx = db.transaction("restaurants", "readwrite");
      const value = tx
        .objectStore("restaurants")
        .get(id + "")
        .then(value => {
          if (!value) {
            console.log("no data found pt2");
            return;
          }
          const restaurantObj = value.data;
          console.log("specific restaurants object: ", restaurantObj);
          if (!restaurantObj)
            return;
          const keys = Object.keys(udpateObj);
          keys.forEach(k => {
            restaurantObj[k] = updateObj[k];
          })

          dbPromise.then(db => {
            const tx = db.transaction("restaurants", "readwrite");
            tx
              .objectStore("restaurants")
              .put({
                id: id + "",
                data: restaurantObj
              });
              return tx.complete;
          })
        })
    })
  }

  //placeholder for alternate favorite method if needed

  //cache iteration to prep for new review input
  static updateCachedRestaurantReview(id, bodyObj) {
    console.log("Lets update cache for new review: ", bodyObj);
    dbPromise.then(db => {
      const tx = db.transaction("reviews", "readwrite");
      const store = tx.objectStore("reviews");
      console.log("putting the review in question into store");
      store.put({
        id: Date.now(),
        "restaurant_id": id,
        data: bodyObj
      });
      console.log("I put the cached review in the store");
      return tx.complete;
    })
  }

  //function to handle new reviews coming up through the interface
  static saveNewReview(id, bodyObj, callback) {
    const url = `${DBHelper.DATABASE_REVIEWS_URL}`;
    const method = "POST";
    DBHelper.updateCachedRestaurantReview(id, bodyObj);
    DBHelper.addPendingRequestToQueue(url, method, bodyObj);
    console.log("saveNewReview callback sent up to pendingRequesttoQueue");
    callback(null,null);
  }

  /*
  entrypoint from review.js to pass the saved review through the
  offline queue to the online queue and up to the json
  */
  static saveReview(id, name, rating, comment, callback) {
    const btn = document.getElementById("btnSaveReview");
    btn.onclick = null;

    const body = {
      restaurant_id: id,
      name: name,
      rating: rating,
      comments: comment,
      createdAt: Date.now()
    }
    DBHelper.saveNewReview(id, body, (error, result) => {
      if (error) {
        console.log("call to saveNewReview failed after creating const body");
        callback(error, null);
        return;
      }
      console.log("saveNewReview initialized");
      callback(null, result);
    })
  }
}