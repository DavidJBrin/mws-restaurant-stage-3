let restaurant;

// serviceWorker registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function(registration) {
      console.log('Service worker registration succeeded:', registration);
    }, /*catch*/ function(error) {
    console.log('Service worker registration failed:', error);
    });
} 
else {
    console.log('Service workers are not supported.');
};

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

fetchRestaurantFromURL = (callback) => {
    if (self.restaurant) {
        callback(null, self.restaurant)
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
            fillReviewHTML();
            callback(null, restaurant)
        });
    }
}

//create restaurant html and attach to page
fillReviewHTML = (restaurant = self.restaurant) => {
    const image = document.getElementById('review-img');
    image.className = 'review-img';
    image.src = DBHelper.imageUrlForRestaurant(restaurant);
}

//fill topmenu breadcrumb interface
fillBreadcrumb = (restaurant = self.restaurant) => {
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

//function to support the dbhelper saveReview static
const addReviewListener = () => {
    this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(this.form);
        const body = {
            restaurant_id: parseInt(this.id),
            name: formData.get('name'),
            rating: parseInt(formData.get('rating')),
            comments: formData.get('comments'),
            restaurant_name: self.restaurant.name
        };
        //push review up to the server
        fetch(this.url, {
            method: 'POST',
            body: JSON.stringify(body)
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
        window.location.href= "/restaurant.html?id=" + self.restaurant.id;
    });
}
    
const addReview = (review) => {
        const ul = document.getElementById('reviews-list');
        const reviewItem = restaurant_info.createReviewHTML(review);
        ul.appendChild(reviewItem);
    }

const deferSubmission = (review) => {
        review.deferredAt = new Date();
        idbProject.dbPromise.then(db => {
            const deferStore = db.transaction('pending', 'readwrite').objecStore('pending');
            return deferStore.put(review);
        })
        .then(() => {
            window.addEventListener('online', DBHelper.submitDeferred);
        })
        .catch(err => console.log('Could not write to deferred storage', err));
}
