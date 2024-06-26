/**
 * IMPORT SECTION
 */
// group that runs  the workflow
const groupsTemplate = require('./distribution/all/groups');
const distribution = require('./distribution');
const id = distribution.util.id;

//////////////////////////////////////////////////////////////////

/**
 * CONFIG SECTION
 */

// nodes in the system = EC2 instances
const n1 = {ip: '127.0.0.1', port: 8081};
const n2 = {ip: '127.0.0.1', port: 8082}
const n3 = {ip: '127.0.0.1', port: 8083};
const n4 = {ip: '127.0.0.1', port: 8080}
const workerGroup = {};
workerGroup[id.getSID(n1)] = n1;
workerGroup[id.getSID(n2)] = n2;
workerGroup[id.getSID(n3)] = n3;
workerGroup[id.getSID(n4)] = n4;
let localServer = null;
const workerConfig = {gid: 'worker'};
//////////////////////////////////////////////////////////////////

/**
 * HELPER SECTION
 */
// first thing the coordinator does is set up the group
function isEmptyObject(obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}
const setGroup = (server) => {
  localServer = server;
  groupsTemplate(workerConfig).put(workerConfig, workerGroup, async (e, v) => {
    if ( !isEmptyObject(e)) {
      cleanup(new Error('ERROR PUTTING THE GORUP'));
      console.log("Error");
      return;
    } else {
      console.log(JSON.stringify(e));
      console.log(JSON.stringify(v));
      await workflow();
      cleanup();
      return;
    }
  });
}

let cntr = 0;

async function workflow() {
  const totalRepos = 100;
  async function fetchAllRepos() {
    let page = 1;
    let dataset = [];
    while (dataset.length < totalRepos) {
      const newRepos = await distribution.util.crawl.fetchRepos(page, Math.min(100, totalRepos - dataset.length));
      dataset = dataset.concat(newRepos);
      if (newRepos.length === 0) {
        break;
      }
      page++;
    }
    return dataset;
  }
  let dataset = await fetchAllRepos();
  return await new Promise((resolve, reject) => {
    dataset.forEach((o) => {
      let key = Object.keys(o)[0];
      let value = o[key];
      distribution.worker.store.put(value, key, (e, v) => {
        cntr++;
        if (cntr === dataset.length) {
          resolve(doMapReduce());
        }
      });
    });
  });
}

const doMapReduce = async () => {
  return new Promise((resolve, reject) => {
    distribution.worker.store.get(null, async (e, v) => {
      console.log('key number: ', v.length);
      distribution.worker.mr.exec({
        keys: v,
        map: async (key, value) =>
          await distribution.util.searchPreprocessing['map'](key, value),
        reduce: async (key, value) =>
          await distribution.util.searchPreprocessing['reduce'](key, value),
      }, (error, value) => {
        if (error) {
          reject(error);
          return;
        }
        try {
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
};

function cleanup(e) {
    console.log(e);
  let remote = {service: 'status', method: 'stop'};
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        localServer.close();
        process.exit(1)
      });
    });
  });
}
//////////////////////////////////////////////////////////////////
/**
 * EXECUTION SECTION
 */

global.nodeConfig = {ip: '127.0.0.1', port: 8080};

distribution.node.start(setGroup);
