const { removeStopwords } = require('stopword');
var natural = require('natural');

/**
 * Processes the input text by normalizing, removing stopwords, and stemming the remaining words.
 * @param {string} textContent - The text content to process.
 * @returns {string[]} An array of processed words, where each word has been stemmed and lowercased, excluding any stopwords.
 */
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
 * Calculates the term frequency (TF) for each word and adds it along with other metadata to the TF matrix.
 * @param {string[]} somegram - The array of words or n-grams.
 * @param {Object} tfMatrix - The matrix object to which the term frequencies will be added.
 * @param {string} url - The URL of the repository.
 * @param {number} forksCount - The count of forks of the repository.
 * @param {number} openIssuesCount - The count of open issues in the repository.
 * @param {number} stargazersCount - The count of stargazers of the repository.
 * @param {number} watchersCount - The count of watchers of the repository.
 * @param {string} ownerLogin - The login of the repository owner.
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


