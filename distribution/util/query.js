
/*
Frontend passes term entered to the manager node
- distributed.group.store.get(n-gram) to retrieve { n-gram: [ {url, relative freq, metrics}, {} ]  }
- rank the results based on term freq + trust score (both should already be calculated)
- display based on user selected sorting preference
*/