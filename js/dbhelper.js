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
  Method based on zoom call and review of code with Greg Pawlowski and modeled on
  approach used in his repo: https://github.com/gregpawlowski/mws-restaurant-stage1/blob/master/src/js/dbhelper.js
*/
  static submitDeferred() {
    idbProject.dbPromise.then( db => {
      const store = db.transaction('offlineReviews').objectStore('offlineReviews');
      const submittedRes = {};
      store.getAll()
        .then(revs => {
          if(revs.length === 0) return;
          return Promise.all(revs.map( rev => {
            return fetch(`${DBHelper.DATABASE_URL}/reviews`, {
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
            const store =  db.transaction('offlineReviews', 'readwrite').objectStore('offlineReviews');
            store.clear();
          }))
        })
    })
  }
}  


