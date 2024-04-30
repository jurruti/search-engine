// This file contains the map and reduce functions for search preprocessing.

const crawl = require('./crawl');
const indexer = require('./indexer');


module.exports = {
  map: async (key, value) => {
    // key is the repo_name and value is the repoInfo
    let {
      repoUrl,
      ownerLogin,
      repoName,
      forksCount,
      openIssuesCount,
      stargazersCount,
      watchersCount,
    } = value;
    // TODO: Decide if we should use
    //  repo description (fetchRepoDescription) or Readme (fetchReadMeFile)
    const content = await crawl.fetchRepoDescription(ownerLogin, repoName);
    const wordsArray = indexer.process(content);
    // console.log('wordsArray: ', wordsArray);
    return indexer.invert(
        wordsArray,
        repoUrl,
        forksCount,
        openIssuesCount,
        stargazersCount,
        watchersCount);
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
