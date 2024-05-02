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
const n1 = {ip: '172.31.19.210', port: 8080};
const n2 = {ip: '172.31.24.240', port: 8080};
const n3 = {ip: '172.31.25.251', port: 8080};
const workerGroup = {};
workerGroup[id.getSID(n1)] = n1;
workerGroup[id.getSID(n2)] = n2;
workerGroup[id.getSID(n3)] = n3;
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
  const dataset = await distribution.util.crawl.fetchRepos(1, 100);
  return await new Promise((resolve, reject) => {
    dataset.forEach((o) => {
      let key = Object.keys(o)[0];
      let value = o[key];
      console.log('KEY '+key);
      console.log('VALUE '+value);
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
      distribution.worker.mr.exec({
        keys: v,
        map: async (key, value) =>
          await distribution.util.searchPreprocessing['map'](key, value),
	reduce: async (key, value) =>
          await distribution.util.searchPreprocessing['reduce'](key, value),
      }, (error, value) => {
        if (error) {
          reject(cleanup(e));
          return;
        } else {
          console.log('FINAL');
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

global.nodeConfig = {ip: '172.31.26.178', port: 8080};

distribution.node.start(setGroup);