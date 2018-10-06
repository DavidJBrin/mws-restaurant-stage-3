//Use of a ES6 constructor superfunction in order to add methods accessible in the building of the review, and then submission or idb push

/*
   * Fetch a restaurant by its ID.
   * Based on information garnered from the Udacity Course on IDB featuring Wittr
   * and conversations with project coach Doug Brown
   * Functionality adjusted and streamlined through coding coaching with Doug Brown
   * and Greg Pawlowski. Structure suggested and outlined through conversations and
   * code alongs in order to fold in proper techniques to existing techniques from 
   * a more informed/skilled perspective.    
   */
  
class formAction {
  constructor(form, url) {
    this.form = form;
    this.url = url;
    this.addListener();
    this.id = Number(self.getParameterByName('id'));
  }


  addListener() {
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

      // Send the review to the server
      fetch(this.url, {
        method: 'POST',
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      // If response is ok add the review to indexed DB and to the page
      .then(review => {
        if (!review) return new Error('No review after submitting');
        this.addReview(review);
      })
      // Otherwise if response is not ok then add the review to indexedDB for future submission
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

  addReview(review) {
    const ul = document.getElementById('reviews-list');
    const reviewElem = createReviewHTML(review);
    reviewElem.classList.add('review--hidden');
    ul.appendChild(reviewElem);
    requestAnimationFrame(() => reviewElem.classList.add('fadeIn'));
  }

  deferSubmission(review) {
    review.deferredAt = new Date();
    idbProject.dbPromise.then(db => {
      const deferStore = db.transaction('deferredReviews', 'readwrite').objectStore('deferredReviews');
      return deferStore.put(review);
    })
    .then(() => {
      window.addEventListener('online', DBHelper.submitDeferred);
    })
    .catch(err => console.log('Could not insert into deferred storage', err));
  }
}