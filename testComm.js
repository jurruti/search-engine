
/**
 * IMPORT SECTION
 */
// group that runs  the workflow
const groupsTemplate = require('./distribution/all/groups');
const distribution = require('./distribution');
const path = require('path');
const fs = require('fs');
const {convert} = require('html-to-text');
const id = distribution.util.id;

//////////////////////////////////////////////////////////////////

/**
 * CONFIG SECTION
 */

// nodes in the system = EC2 instances
const n1 = {ip: '127.0.0.1', port: 7110};
const n2 = {ip: '127.0.0.1', port: 7111};
const n3 = {ip: '127.0.0.1', port: 7112};

workerGroup[id.getSID(n1)] = n1;
workerGroup[id.getSID(n2)] = n2;
workerGroup[id.getSID(n3)] = n3;

const workerConfig = {gid: 'worker'};
//////////////////////////////////////////////////////////////////

/**
 * HELPER SECTION
 */
// first thing the coordinator does is set up the group
function isEmptyObject(obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}
const setGroup = () => {
  groupsTemplate(workerConfig).put(workerConfig, workerGroup, (e, v) => {
    if (!e || isEmptyObject(e)) {
      console.log('ERROR PUTTING THE GORUP');
      cleanup();
      return;
    } else {
      workflow();
    }
  });
}

async function workflow() {
  return await new Promise((resolve, reject) => {
    dataset.forEach((o) => {
      let key = Object.keys(o)[0];
      let value = o[key];
      distribution.groupA.store.put(value, key, (e, v) => {
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
    distribution.workerGroup.store.get(null, async (e, v) => {
      distribution.workerGroup.mr.exec({
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
          console.log('FINAL: '+v.length);
        }
      });
    })
  });
};

//////////////////////////////////////////////////////////////////
/**
 * EXECUTION SECTION
 */

global.nodeConfig = {ip: '172.31.26.178', port: 8080, onStart: setGroup};

function cleanup(e) {
  if (!e) {
    console.log(e);
  }
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


