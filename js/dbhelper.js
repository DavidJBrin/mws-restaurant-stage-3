/**
 * Common database helper functions.
 */
const port = 1337; // Change this to your server port
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    return `http://localhost:${port}/restaurants`;
  }

  static get DATABASE_REVIEW_URL() {
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

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    //fix the record with missing id field
    if (restaurant.photograph == undefined)
      restaurant.photograph = restaurant.id;
    return (`/img/${restaurant.photograph}.jpg`);
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
  
  //Create js behavior for saving the review
  static saveReview(id, name, rating, comment, callback) {
    //don't allow submission of blank reviews
    const btn = document.getElementById("btnSaveReview");
    btn.onclick = null;
    //create the body to POST via method
    const body = {
      restaurant_id: id,
      name: name,
      rating: rating,
      comments: comment,
      createdAt: Date.now()
    }
    let offline_obj = {
      name:'addReview',
      data: body,
      objtect_type: 'review'
    };
    //Is it offline? Let's see...
    if(!navigator.online && (offline_obj.name === 'addReview')) {
      console.log("Offline - sending review when online status resumed");
      sendDataWhenOnline(offline_obj);
      return;
    }
    console.log(body);
    const url = `${this.DATABASE_ADD_REVIEW_URL}`;
    console.log(url);
    const method = "Post";
    const properties = {
      body: JSON.stringify(body),
      method: method
    }
    fetch (url, properties)
    .then(response => response.json())
    .catch(error => console.error("Could not add Review - Failed"))
    .then(response => console.log('Added the review successfully'));
    callback(null, null);
  }
  
  static sendDataWhenOnline(offline_obj) {
    console.log('Offline Obj', offline_obj);
    localStorage.setItem('data', JSON.stringify(offline_obj.data));
    console.log(`Local Storage: ${offline_obj.object_type} store`);
    window.addEventListener('online', (event) => {
      console.log('Browser Back Online!');
      let data = JSON.parse(localStorage.getItem('data'));
      console.log('update and clean up the ui');
      [...document.querySelectorAll(".reviews_offline")]
      .forEach(e => {
        el.classList.remove("reviews_offline")
        el.querySelector(".offline_label").remove()
      });
      if (data != null) {
        console.log(data);
        if (offline_obj.name === 'addReview') {
          DBHelper.addReview(offline_obj.data);
        }
        console.log('Local State: data sent to api');
        localStorage.removeItem('data');
        console.log(`Local storage ${(offline_ojb.object_type)} removed`);
      }
    });
  }
}

