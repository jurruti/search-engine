const {convert} = require('html-to-text');
const { removeStopwords } = require('stopword');
var natural = require('natural');

function process(textContent) {
  // split into words, convert nonletter sequence to spaces
  if (!textContent) {
    textContent = '';
  }
  let words = textContent.split(/[^A-Za-z]+/).filter((word) => word);
  // lowercase
  words = words.map((word) => word.toLowerCase());
  // stopwords
  words = removeStopwords(words);
  words = words.map(natural.PorterStemmer.stem);
  return words;
}

/**
 * Generates TF matrix from terms array
 */
function tf(somegram, tfMatrix, url, forksCount, openIssuesCount, stargazersCount, watchersCount, ownerLogin) {
  const gramCounts = somegram.reduce((counts, word) => {
    const gram = typeof word === 'string' ? word : word.join(' ');
    counts[gram] = (counts[gram] || 0) + 1;
    return counts;
  }, {});
  const totalGrams = somegram.length;
  for (const gram in gramCounts) {
    if (gramCounts.hasOwnProperty(gram)) {
      tfMatrix[gram] = tfMatrix[gram] || {};
      tfMatrix[gram]['tf'] = gramCounts[gram] / totalGrams;
      tfMatrix[gram]['url'] = url;
      tfMatrix[gram]['forks'] = forksCount;
      tfMatrix[gram]['issues'] = openIssuesCount;
      tfMatrix[gram]['stars'] = stargazersCount;
      tfMatrix[gram]['watchers'] = watchersCount;
      tfMatrix[gram]['owner'] = ownerLogin;
    }
  }
}

function invert(onegram, url, forksCount, openIssuesCount, stargazersCount, watchersCount, ownerLogin) {
  const NGrams = natural.NGrams;
  const twogram = NGrams.bigrams(onegram);
  const trigram = NGrams.trigrams(onegram);
  const tfMatrix = {};
  tf(onegram, tfMatrix, url, forksCount, openIssuesCount, stargazersCount, watchersCount, ownerLogin);
  tf(twogram, tfMatrix, url, forksCount, openIssuesCount, stargazersCount, watchersCount, ownerLogin);
  tf(trigram, tfMatrix, url, forksCount, openIssuesCount, stargazersCount, watchersCount, ownerLogin);
  return tfMatrix;
}


module.exports = {
  process,
  invert,
};


