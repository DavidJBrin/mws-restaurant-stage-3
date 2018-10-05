function addEventListener() {
    this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(this.form);
        const reviewData = {
            restaurant_id: parseInt(this.id),
            name: formData.get('name'),
            rating: parseInt(formData.get('rating')),
            comments: formData.get('comments'),
            restaurant_name: self.restaurant.name
        };

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
        this.form.reset();
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
