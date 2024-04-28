// This file contains the map and reduce functions for search preprocessing.

const crawl = require('./crawl');
const indexer = require('./indexer');


module.exports = {
  map: (key, value) => {
    // key is the owner_name and value is the repo_name
    const readme = crawl.fetchReadMeFile(key, value);
    const wordsArray = indexer.process(readme);
    const tfMatrix = indexer.invert(wordsArray, key);

  },
  reduce: (key, value) => {
    const tfMatrix = {};
    value.forEach((tfObj) => {
      for (const term in tfObj) {
        if (tfMatrix[term]) {
          tfMatrix[term].tf += tfObj[term].tf;
        } else {
          tfMatrix[term] = tfObj[term];
        }
      }
    });
    return tfMatrix;
  },
};
