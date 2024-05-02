// This file contains the map and reduce functions for search preprocessing.

const crawl = require('./crawl');
const indexer = require('./indexer');

module.exports = {
  /**
   * Maps each repository to its processed content and generates an inverted index entry.
   * This function retrieves detailed data about a repository, processes the text content
   * of the repository's description, and prepares an inverted index entry with associated metrics.
   *
   * @param {string} repoName - The name of the repository.
   * @param {string} ownerLogin - The GitHub login of the repository's owner.
   * @returns {Promise<Object>} A promise that resolves to an object representing an inverted index entry.
   */
  map: async (repoName, ownerLogin) => {
    let {
      repoUrl,
      forksCount,
      openIssuesCount,
      stargazersCount,
      watchersCount,
      content,
    } = await crawl.fetchRepoData(ownerLogin, repoName);

    const wordsArray = indexer.process(content);

    return indexer.invert(
        wordsArray,
        repoUrl,
        forksCount,
        openIssuesCount,
        stargazersCount,
        watchersCount,
        ownerLogin,
    );
  },

  /**
   * Reduces the mapped data to a sorted list of top entries based on a calculated trust score.
   * This function sorts the mapped entries based on a trust score and text frequency, and stores
   * the top results in a distributed store.
   *
   * @param {string} key - The search query key.
   * @param {Array<Object>} value - An array of objects containing the inverted index entries for the key.
   * @returns {Promise<string>} A promise that resolves to a string indicating success or logs an error.
   */
  reduce: async (key, value) => {
    console.log('length ', value.length);
    const trustScore = (value) => {
      return Math.log(
        5*value['forks'] + 5*value['issues'] +
        value['stars'] + value['watchers'] + 1);
    };
    value.sort((a, b) => {
      return trustScore(b)*b['tf'] - trustScore(a)*a['tf'];
    });

    const topEntries = value.slice(0, 10);

    for (let i = 0; i<topEntries.length; i++) {
      topEntries[i]['rank'] = i+1;
      topEntries[i]['trustScore'] = trustScore(topEntries[i]);
    }

    try {
      await new Promise((resolve, reject) => {
        global.distribution.all.store.put(topEntries, `query%%%${key}`, (e, v) => {
          console.log('Stored indexer output');
          if (e) {
            reject(e);
          } else {
            resolve();
          }
        });
      });
      console.log('Success');
      return 'success';
    } catch (e) {
      console.error('Error storing indexer output', e);
    }
  },
};
