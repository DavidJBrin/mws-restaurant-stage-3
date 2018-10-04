let restaurant;
var newMap;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(function(registration) {
    console.log('Service worker registration succeeded:', registration);
  }, /*catch*/ function(error) {
    console.log('Service worker registration failed:', error);
  });
} else {
  console.log('Service workers are not supported.');
};

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
  if (navigator.onLine) {
    DBHelper.submitDeferred();
  }
  document.addEventListener('DOMContentLoaded', (event) => {
    console.log('loading restaurant url for page foundation');
    fetchRestaurantFromURL((error, restaurant) => {
        if (error) {
            console.error(error);
        }
        else {
            console.log("filling breadcrumb");
            fillBreadcrumb();
        }
    });
  });
});
/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoianVzdGlucmFpdGgiLCJhIjoiY2pqcnBmM3RnMnljajNwczRncTRhZXgzMCJ9.LPn69ILoIVDVlxlDvAWseQ',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}  
 
/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    console.log('fetchRestaurantFromURL first return triggered')
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  let favorite;
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  favorite = document.getElementById('restaurant-favorite');
  if (restaurant.is_favorite === "undefined")
    restaurant.is_favorite="false";
  favorite.setAttribute('aria-label', 'Click to favorite or unfavorite' + restaurant.name)
 

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  // fill reviews
  idbProject.addReviews(restaurant.id, fillReviewsHTML);
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (error, reviews) => {
  self.restaurant.reviews = reviews;
  console.log(reviews);
  if (error) {
    console.log("Error retrieving review: ", error);
  }
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = `Name: ${review.name}`;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = `Date ${new Date(review.createdAt).toLocaleString()}`;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};



/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) {
      callback(null, self.restaurant)
      console.log("restaurant is self");
      return;
  }
  const id = getParameterByName('id');
  if (!id) {
      error = 'No restaurant id in the URL'
      callback(error, null);
  }
  else {
      DBHelper.fetchRestaurantById(id, (error, restaurant) => {
          self.restaurant = restaurant;
          if (!restaurant) {
              console.error(error);
              return;
          }
          callback(null, restaurant)
      });
  }
}



//fill topmenu breadcrumb interface
fillBreadcrumb = (restaurant = self.restaurant) => {
  console.log("fillBreadCrumb accessed");
  const breadcrumb = document.getElementById('breadcrumb-restaurant');
  const li = document.createElement('li');
  li.innerText = restaurant.name;
  breadcrumb.href = `/restaurant.html?id=` + restaurant.id;
  breadcrumb.appendChild(li);
}

// parameters retrieved from page
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

const handleFavoriteClick = (id, newState) => {
  const favorite = document.getElementById("favorite-icon" + id);
  self.restaurant["is_favorite"] = newState;
  favorite.onclick = event => handleFavoriteClick(restaurant.id, !self.restaurant["is_favorite"]);
  DBHelper.handleFavoriteClick(id, newState);
}

function addReviewListener() {
  this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(this.form);
      const data = {
          restaurant_id: parseInt(this.id),
          name: formData.get('name'),
          rating: parseInt(formData.get('rating')),
          comments: formData.get('comments'),
          restaurant_name: self.restaurant.name
      };
      console.log(data);
      //push review up to the server
      fetch(this.url, {
          method: 'POST',
          body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(review => {
          if (!review) return new Error('No review on submission press');
          this.addReview(review);
      })
      .catch(err => {
          if (!navigator.onLine) {
              this.deferSubmission(data);
              return this.addReview(data);
          }
          console.log(err);
      });

      this.form.reset();
  });
}
  
function addReview(review) {
      const il = document.getElementById('reviews-list');
      const reviewItem = restaurant_info.createReviewHTML(review);
      il.appendChild(reviewItem);
  }

function deferSubmission(review) {
      review.deferredAt = new Date();
      idbProject.dbPromise.then(db => {
          const deferStore = db.transaction('offlineReviews', 'readwrite').objecStore('offlineReviews');
          return deferStore.put(review);
      })
      .then(() => {
          window.addEventListener('online', DBHelper.submitDeferred);
      })
      .catch(err => console.log('Could not write to deferred storage', err));
}

