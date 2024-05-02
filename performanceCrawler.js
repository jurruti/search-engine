global.nodeConfig = {ip: '127.0.0.1', port: 7070};
const distribution = require('./distribution');
const path = require('path');
const fs = require('fs');
const {convert} = require('html-to-text');

const id = distribution.util.id;

const groupsTemplate = require('./distribution/all/groups');
function readFileSync(path) {
  try {
    // Read the file synchronously
    const data = fs.readFileSync(path, 'utf8');
    console.log('File read successfully!');
    return data;
  } catch (error) {
    // Handle possible errors
    console.error('Error reading the file:', error);
    return null;
  }
}

function makeDataset(data, n) {
  const arr = [];
  for (let i=0; i<n; i++) {
    arr.push({[i]: data[i%5]});
  }
  return arr;
}

//const thefile = convert(readFileSync(path.join(__dirname, './somepage.txt')), {wordwrap: false});

const thefile = ['https://www.google.com',
                  'https://www.linkedin.com',
                  'https://github.com/facebookresearch/detectron2/blob/main/README.md',
                  'https://github.com/fredfeng/CS162',
                  'https://github.com/opethe1st/Algorithms-by-S.Dasgupta']



const data1 = makeDataset(thefile, 1);
const data10 = makeDataset(thefile, 10);
const data100 = makeDataset(thefile, 100);
const data1000 = makeDataset(thefile, 1000);
const data10000 = makeDataset(thefile, 10000);
const dataset = data1000;


const crawlerGroup = {};
let localServer = null;
const n1 = {ip: '127.0.0.1', port: 1010};
const n2 = {ip: '127.0.0.1', port: 1011};
const n3 = {ip: '127.0.0.1', port: 1012};

crawlerGroup[id.getSID(n1)] = n1;
crawlerGroup[id.getSID(n2)] = n2;
crawlerGroup[id.getSID(n3)] = n3;

const startNodes = (cb) => {
  distribution.local.status.spawn(n1, (e, v) => {
    distribution.local.status.spawn(n2, (e, v) => {
      distribution.local.status.spawn(n3, (e, v) => {
        cb();
      });
    });
  });
};


let m2 = async (name, url) => {
  global.log('in map');
  await new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let page = '';
      res.on('data', (d) => {
        page += d;
      });
      res.on('end', () => {
        global.distribution.local.store.put(page, url, () => {
          global.log('stored page');
          resolve();
        });
      });
    }).on('error', (e) => {
      global.log('error storing page');
      reject(e);
    });
  });

  global.log('promise resolved!');

  let out = {};
  out[name] = 'stored';
  return out;
};

let r2 = (key, values) => {
  let out = {};
  out[key] = values;
  return out;
};


distribution.node.start((server) => {
  localServer = server;

  const crawlerConfig = {gid: 'crawler'};
  startNodes(() => {
    groupsTemplate(crawlerConfig).put(crawlerConfig, crawlerGroup, (e, v) => {
      let cntr = 0;
      dataset.forEach((o) => {
        let key = Object.keys(o)[0];
        let value = o[key];
        distribution.crawler.store.put(value, key, (e, v) => {
          cntr++;
          if (cntr === dataset.length) {
            const start = new Date();
            doMapReduce(start);
          }
        });
      });
    });
  });
});

function doMapReduce(start) {
  distribution['crawler'].store.get(null, (e, v) => {
    distribution['crawler'].mr.exec({keys: v, map: m2,
      reduce: r2}, (e, v) => {
      distribution.local.store.put(v, 'crawler-result', (e, v) => {
        afterAll(start);
      });
    });
  });
};


function afterAll(start) {
  let endTime = new Date();
  let timeDiff = endTime - start; 
  console.log("Time elapsed: " + timeDiff + " ms");
  let remote = {service: 'status', method: 'stop'};
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        localServer.close();
      });
    });
  });
}

