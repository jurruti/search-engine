const serialization = require('./serialization');
const id = require('./id');
const wire = require('./wire');
const searchPreprocessing = require('./search_preprocessing');
const crawl = require('./crawl');
const indexer = require('./indexer');


module.exports = {
  serialize: serialization.serialize,
  deserialize: serialization.deserialize,
  id: id,
  wire: wire,
  searchPreprocessing: searchPreprocessing,
  crawl: crawl,
  indexer: indexer,
};
