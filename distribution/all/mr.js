
const local = require('../local/local');
const util = require('../util/util');
const routes = require('./routes');
const comm = require('./comm');


function generateRandomString(length) {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXabcdefghijklmnopqrstuvwx0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const mr = function(config) {
  let context = {};
  context.gid = config.gid || 'all';


  return {
    exec: (configuration, callback) => {
      /* Change this with your own exciting Map Reduce code! */
      // set up
      callback = callback || function() {};
      let mrService = {
        doMap: (mrName, gid, mapF, keys, cb) => {
          const util = global.distribution.util;
          callback = cb || function() {};
          let errors = [];
          let data = [];
          let count = keys.length;
          keys.forEach((key) => {
            global.distribution[gid].store.get(key, async (e, v) => {
              if (e) {
                errors.push(e);
              } else {
                let mapOut;
                let mapResult = mapF(key, v);
                mapOut = await Promise.resolve(mapResult);

                if (Array.isArray(mapOut)) {
                  data.push(...mapOut);
                } else {
                  data.push(mapOut);
                }
              }
              count -= 1;
            });
          });
          const msn = mrName+'inmem';
          function check() {
            if (count>0) {
              setTimeout(check, 0);
            } else {
              if (errors.length > 0) {
                callback(new Error('keys contain invalid'));
                return;
              }
              global.distribution[msn] = {};
              global.distribution[msn]['map'] = {};
              global.distribution[msn]['reduce'] = {};
              for (const datum of data) {
                for (const key of Object.keys(datum)) {
                  const node = util.id.getHashNode(gid, util.id.getID(key));
                  if (global.nodeConfig['ip'] === node['ip'] &&
                      global.nodeConfig['port'] === node['port']) {
                    if (key in global.distribution[msn]['reduce']) {
                      global.distribution[msn]['reduce'][key].push(datum[key]);
                    } else {
                      global.distribution[msn]['reduce'][key] = [datum[key]];
                    }
                  } else {
                    if (key in global.distribution[msn]['map']) {
                      global.distribution[msn]['map'][key].push(datum[key]);
                    } else {
                      global.distribution[msn]['map'][key] = [datum[key]];
                    }
                  }
                }
              }
              const sn = {ip: global.nodeConfig.ip,
                port: global.nodeConfig.port};
              callback(null,
                Object.keys(global.distribution[mrName+'inmem']['map']).length >
                0 ?sn: false);
              return;
            }
          }
          setTimeout(check, 0);
          return;
        },
        shuffleSend: (mrName, gid, cb) => {
          const callback = cb || function() {};
          const util = global.distribution.util;
          const data = global.distribution[mrName+'inmem']['map'];
          let count = Object.keys(data).length;
          let reducers = [];
          for (const key of Object.keys(data)) {
            const arr = data[key];
            const node = util.id.getHashNode(gid, util.id.getID(key));
            let args = [mrName, key, arr];
            let remote = {
              node: node,
              service: mrName,
              method: 'shuffleRecv',
            };
            global.distribution.local.comm.send(args, remote, (e, v) => {
              reducers.push(v);
              count -= 1;
            });
          }
          function check() {
            if (count>0) {
              setTimeout(check, 0);
            } else {
              callback(null, reducers);
              return;
            }
          }
          setTimeout(check, 0);
        },
        shuffleRecv: (mrName, key, arr, cb) => {
          const callback = cb || function() {};
          if (!(mrName+'inmem' in global.distribution)) {
            global.distribution[mrName+'inmem'] = {'reduce': {}};
          }
          if (!('reduce' in global.distribution[mrName+'inmem'])) {
            global.distribution[mrName+'inmem'] = {'reduce': {}};
          }
          if (key in global.distribution[mrName+'inmem']['reduce']) {
            global.distribution[mrName+'inmem']['reduce'][key].push(...arr);
          } else {
            global.distribution[mrName+'inmem']['reduce'][key] = arr;
          }
          callback(null, global.distribution[mrName+'inmem']['reduce']);
        },
        doReduce: (mrName, reduceF, cb) => {
          const callback = cb || function() {};
          const msn = mrName+'inmem';
          if (msn in global.distribution &&
            'reduce' in global.distribution[msn]) {
            if (Object.keys(global.distribution[msn]['reduce']).length === 0) {
              callback(null, false);
            } else {
              const results = [];
              for (const key of
                Object.keys(global.distribution[msn]['reduce'])) {
                let result = reduceF(key,
                    global.distribution[msn]['reduce'][key]);
                results.push(result);
              }
              callback(null, results);
            }
          } else {
            callback(null, false);
          }
        },
      };
      let mrServiceName = 'mr-'+generateRandomString(10);
      routes(context).put(mrService, mrServiceName, ()=>{});


      const errors = [];
      let shuffleSenders = [];
      let nodeMap = new Map();
      for (const key1 of configuration['keys']) {
        let node = util.id.getHashNode(context.gid, util.id.getID(key1));
        let nid = util.id.getNID(node);
        let args = [mrServiceName, context.gid, configuration['map'], [key1]];
        let remote = {
          node: node,
          service: mrServiceName,
          method: 'doMap',
        };
        if (nodeMap.has(nid)) {
          nodeMap.get(nid)['args'][3].push(key1);
        } else {
          nodeMap.set(nid, {remote: remote, args: args});
        }
      }
      let count = nodeMap.size;
      for (const nid of nodeMap.keys()) {
        const sendConfig = nodeMap.get(nid);
        local.comm.send(sendConfig['args'], sendConfig['remote'], (e, v) => {
          if (e) {
            errors.push(e);
          } else {
            if (v !== false) {
              shuffleSenders.push(v);
            }
          }
          count -= 1;
          return;
        });
      }

      function reducePhase() {
        console.log('ENTERED REDUCE');
        const args = [mrServiceName, configuration['reduce']];
        const remote = {service: mrServiceName, method: 'doReduce'};
        comm(context).send(args, remote, (e, v) => {
          console.log('LOG REDUCE:' + JSON.stringify(v));
          let result = [];
          for (const key of Object.keys(v)) {
            let entry = v[key];
            if (entry === false) {
              continue;
            }
            for (const res of entry) {
              result.push(res);
            }
          }
          const args = [mrServiceName];
          const remote = {service: 'routes', method: 'cleanup'};
          comm(context).send(args, remote, ()=>{});
          callback(null, result);
        });
      }

      function shufflePhase() {
        let count = shuffleSenders.length;
        for (const sender of shuffleSenders) {
          let args = [mrServiceName, context.gid];
          let remote = {
            node: sender,
            service: mrServiceName,
            method: 'shuffleSend',
          };
          local.comm.send(args, remote, (e, v) => {
            console.log('SHUFFLE SEND:'+JSON.stringify(v));
            count -= 1;
            return;
          });
        }
        function check2() {
          if (count>0) {
            setTimeout(check2, 0);
          } else {
            reducePhase();
            return;
          }
        }
        setTimeout(check2, 0);
      }
      function check1() {
        if (count>0) {
          setTimeout(check1, 0);
        } else {
          if (errors.length > 0) {
            callback(errors);
            return;
          } else {
            shufflePhase();
            return;
          }
        }
      }
      setTimeout(check1, 0);
      return;
    },
  };
};

module.exports = mr;
