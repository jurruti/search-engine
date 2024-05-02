// This file contains the map and reduce functions for search preprocessing.

const crawl = require('./crawl');
const indexer = require('./indexer');


module.exports = {
  map: async (repoName, ownerLogin) => {
    // key is the repoName and value is ownerLogin
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
  reduce: async (key, value) => {
    const trustScore = (value) => {
      return Math.log(
          5*value['forks'] + 5*value['issues'] +
          value['stars'] + value['watchers'] + 1);
    };
    value.sort((a, b) => {
      trustScore(b)*b['tf'] - trustScore(a)*a['tf'];
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
