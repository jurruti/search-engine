global.indexer = require('./indexer.js');


console.log(JSON.stringify(global.indexer.map('url1', 'word 1 word2 word3')));