const {convert} = require('html-to-text');
const { removeStopwords } = require('stopword');
var natural = require('natural');

// How many top results to keep
const TOP = 10;


function getText(pageContent) {
    const text = convert(pageContent, {wordwrap: false});
    return text;
}

function process(textContent) {
  // split into words, convert nonletter sequence to spaces
  let words = textContent.split(/[^A-Za-z]+/).filter(word => word);
  // lowercase
  words = words.map(word => word.toLowerCase());
  // stopwords
  words = removeStopwords(words);
  words = words.map(natural.PorterStemmer.stem);
  return words;
}

/**
 * Generates TF matrix from terms array
 */
function tf(somegram, tfMatrix, url) {
  const gramCounts = somegram.reduce((counts, word) => {
    const gram = typeof word === 'string' ? word : word.join(' ');
    counts[gram] = (counts[gram] || 0) + 1;
    return counts;
  }, {});
  const totalGrams = somegram.length;
  for (const gram in gramCounts) {
    tfMatrix[gram] = {};
    tfMatrix[gram]['tf'] = gramCounts[gram] / totalGrams;
    tfMatrix[gram]['url'] = url;
    // { n-gram: [ {url, relative freq, metrics}, {} ]  }
    // TODO: add metrics: forks, issues, stars, watchers OR a calculated trust score
  }
}

function invert(onegram, url) {
  const NGrams = natural.NGrams;
  const twogram = NGrams.bigrams(onegram);
  const trigram = NGrams.trigrams(onegram);
  const tfMatrix = {};
  tf(onegram, tfMatrix, url);
  tf(twogram, tfMatrix, url);
  tf(trigram, tfMatrix, url);
  return tfMatrix;
} 


module.exports = {
  /**
   * key is url
   * value is a page content
   * output is object of form { n-gram: [ {url, relative freq, metrics}, {} ]  }
   */
  map: (key, value) => {
    // TODO: each node fetch repo for its allocated set of URLs (httpsGet)
    const wordsArray = process(getText(value)); 
    const tfMatrix = invert(wordsArray, key);
    // TODO: shuffle redistribute based on new key = n-gram
    return tfMatrix;
  },
  /**
   * Key is term and value is an object {tf, url}
   */
  reduce: (key, value) => {
    // Sort by term frequency
    // TODO: filter based on tf?
    // TODO: calculate (simple) trust score
    value.sort((a,b) => {b['tf'] - a['tf']});
    for (let i = 0; i<value.length; i++) {
      value[i]['rank'] = i+1;
    }
    // TODO: store indexer output to group (distribution.group.store.put)
    global.distribution.local.store.put(global.distribution.util.serialize(value), key, ()=>{});
    return 'success';
  }
};


