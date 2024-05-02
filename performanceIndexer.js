global.nodeConfig = {ip: '127.0.0.1', port: 7070};
const distribution = require('./distribution');
const path = require('path');
const fs = require('fs');
const {convert} = require('html-to-text');

const id = distribution.util.id;

const groupsTemplate = require('./distribution/all/groups');




const data1 = makeDataset(thefile, 1);
const data10 = makeDataset(thefile, 10);
const data100 = makeDataset(thefile, 100);
const data1000 = makeDataset(thefile, 1000);
const data10000 = makeDataset(thefile, 10000);
const dataset = data1;


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
    distribution['crawler'].mr.exec({keys: v, map: (key, value) => { 
      return global.indexer['map'](key,value);
    },
      reduce: (key, value) => { 
        return global.indexer['reduce'](key,value);
      } }, (e, v) => {
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

