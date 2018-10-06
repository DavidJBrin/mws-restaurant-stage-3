class formAction {
    constructor(form, url) {
      this.form = form;
      this.url = url;
      this.addListener();
      this.id = Number(self.getParameterByName('id'));
  }
}
 
 function addListener() {
    var reviewForm = document.getElementsByClassName("form")[0];
    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(reviewForm);
        const reviewData = {
            restaurant_id: self.restaurant.id,
            name: formData.get('name'),
            rating: parseInt(formData.get('rating')),
            comments: formData.get('comments'),
            restaurant_name: self.restaurant.name
        };
        console.log(reviewData);
        debugger;
        //send review to the server
        fetch(this.url, {
            method: 'POST',
            body: JSON.stringify(reviewData)
        })
        .then(response => response.json())
        //response is good means we add it to the indexed DB AND to page
        .then(review => {
            if (!review) return new Error('No review after submitting');
            this.addReview(review);
        })
        //That response was bad so we're gonna index it for later
        .catch(err => {
            if(!navigator.onLine) {
                this.deferSubmission(reviewData);
                return this.addReview(reviewData);
            }
            console.log(err);
        });
        //need to reset form somehow setting all to default.
    });
}

function addReview(review) {
    const ul = document.getElementById('reviews-list');
    const reviewElem = Restaurant_info.createReviewHTML(review);
    ul.appendChild(reviewElem);
}

function deferSubmission(review) {
    review.deferredAt = new Date();
    DBhelper.idbPromise.then(db => {
        const deferStore = db.transaction('deferredReviews', 'readwrite').objectStore('deferredReviews');
        return deferStore.put(review);
    })
    .then(() => {
        window.addEventListener('online', DBHelper.submitDeferred);
    })
    .catch(err => console.log('Could not add to deferred storage', err));
}
