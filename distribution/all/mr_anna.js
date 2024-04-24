const path = require('path');
const fs = require('fs');

const process = function(nodeValues) {
  // nodeValues: {nodeSID1: aggReduceOut={1950: 22, 2000: 0}, nodeSID2: ...}
  // change into [{"1950": 22}, {2000: 0}, {"1949": 111}]
  // NOTE: could change in mrWorkerS.notify-'reduce'
  let finalOut = [];
  for (const [nodeSID, aggReduceOut] of Object.entries(nodeValues)) {
    if (nodeSID) {
    }
    for (const [k, v] of Object.entries(aggReduceOut)) {
      finalOut.push({[k]: v});
    }
  }
  return finalOut;
};

global.debugLog = function(fn, obj) {
  let fp = path.join(
      path.dirname(path.dirname(__dirname)), // project root (m4/)
      'store',
      's-' + distribution.util.id.getSID(nodeConfig),
      fn,
  );

  fs.mkdir(path.dirname(fp), {recursive: true}, function(err) {
    if (err) {
      return callback(err, null);
    }
    fs.writeFile(fp, global.distribution.util.serialize(obj), () => {});
  });
};


// Below adapted from local.mem
global.gid2keyObj = new Map();
gid2keyObj.set(global.defaultGID, new Map());

global.tempMemPut = function(obj, info, callback) {
  /* idempotent */
  callback = callback || global.defaultCb;

  // 1. parse info for object's key and gid
  let key;
  let gid = global.defaultGID;
  if (typeof info === 'string' || info instanceof String) {
    key = info;
  } else { // {key: "jcarbmpg", gid: "browncs"}
    key = info.key;
    if (key == null) {
      key = distribution.util.id.getID(obj);
    }
    gid = info.gid;
  }

  // 2. put or update value
  if (!gid2keyObj.has(gid)) {
    gid2keyObj.set(gid, new Map());
  }
  gid2keyObj.get(gid).set(key, obj);
  callback(null, gid2keyObj.get(gid).get(key));
};

global.tempMemGet = function(info, callback) {
  /* idempotent */
  callback = callback || global.defaultCb;

  // 1. parse info for object's key and gid + deals with null key
  let key;
  let gid = global.defaultGID;
  if (typeof info === 'string' || info instanceof String) {
    key = info;
  } else { // {key: "jcarbmpg", gid: "browncs"}
    key = info.key;
    gid = info.gid;

    // 2. key not null, retrieve specific object
    if (gid2keyObj.has(gid)) {
      if (gid2keyObj.get(gid).has(key)) {
        callback(null, gid2keyObj.get(gid).get(key));
      } else {
        callback(
            new Error(`[localMemGet]: ${key} does not exist for gid=${gid}`),
            null,
        );
      }
    } else {
      callback(new Error(`[localMemGet]: gid=${gid} does not exist`), null);
    }
  };
};


const mrWorkerS = function(config) {
  // let mrWorkerSCon = {};
  // for (const [k, v] of Object.entries(config)) {
  //   mrWorkerSCon[k] = v;
  // }
  // msg.mrWorkerSContext.hash = config.hash ||
  // global.distribution.util.id.naiveHash;

  return {
    // service for workers (all nodes in group)
    // does not call local.comm.send at all
    // listens to coordinator via local.routes.get in node.js's listen loop
    notify: (msg, callback) => {
      /*
        receives notifications from coordinator telling it to move on to
        the next phase and move on to the next phase
        (does the main deal)

        msg = { phase: "map" } // phase to go to
      */

      callback = callback || global.defaultCb;

      if (msg.phase === 'map') { // + compaction
        // 1. fetches all locally stored objects it was allocated earlier
        distribution.local.store.get(
            {key: null, gid: msg.mrWorkerSContext.gid},
            (e, keys) => {
            // debugLog("s-"+distribution.util.id.getSID(nodeConfig),
            // "debug", keys);

              let aggMapOut = [];

              // 2. pass each key and corresponding object to the map function
              let valCounts = 0;
              keys.forEach((key) => {
                distribution.local.store.get(
                    {key: key, gid: msg.mrWorkerSContext.gid},
                    (e, value) => {
                      let mapOut = msg.mrWorkerSContext.map(key, value);
                      if (mapOut instanceof Array) {
                        aggMapOut = aggMapOut.concat(mapOut); // merge
                        // [{It: 1}, {It: 1}, {a: 1}]
                      } else {
                        aggMapOut.push(mapOut);
                        // [{1950: 22}, {1950: -11}, {1000: 0}]
                      }
                      // cpctAggMapOut: { It: [1,1], a:[1] }
                      //                { 1950: [22,-11], 1000: [0]}
                      valCounts++;
                      if (valCounts == keys.length) {
                        // 3. compaction (data structure in memory)
                        // NOTE: can also move to shuffle below

                        // cpctAggMapOut =
                        //     msg.mrWorkerSContext.compact(aggMapOut);
                        // debugLog('aggMapOut', aggMapOut);
                        // debugLog('cpctAggMapOut', cpctAggMapOut);

                        // 4. Has run map on all local values,
                        //    locally store intermediate results
                        tempMemPut(
                            msg.mrWorkerSContext.compact(aggMapOut),
                            {key: 'aggMapOut', gid: msg.mrWorkerSContext.gid},
                            (e, v) => {
                              // for retrieval in shuffle

                              // 5. updatephase +
                              //    serviceCallback to coordinator (mr.exec)
                              msg.mrWorkerSContext.phase = msg.phase;
                              // update local variable
                              callback(e, v); // (null, obj) on success
                            },
                        );
                      }
                    },
                );
              });
            },
        );
      } else if (msg.phase === 'shuffle') {
        // if (msg.mrWorkerSContext.phase !== 'map') {
        //   callback(new Error('not in map when trying to start shuffle',
        //   null));
        //   return;
        // }

        tempMemGet(
            {key: 'aggMapOut', gid: msg.mrWorkerSContext.gid},
            (e, aggMapOut) => {
            //  {1950: [22, -11], 1000: [0]}
              if (e) {
                callback(e, null);
                return;
              }

              let currNResponses = 0;
              for (const [aggMapOutK, aggMapOutV] of
                Object.entries(aggMapOut)) {
              // console.log(`${k}: ${v}`);
              // {aggMapOutK: aggMapOutV} = {1950: [22, -11]}

                // S1. shuffling: for each key-value from map, use hashing to
                //     send to the reduce node responsible for it, which groups
                //     and puts it in local storage
                // NOTE: distribution[context.gid].store.put does not work as
                //      it will mix these intermediate shuffled val with
                //      original data -> recvShuffle

                // Adapted from all.store.put():
                // 1.1. convert to key identifier (KID) by sha256
                let kid = distribution.util.id.getID(aggMapOutK);
                // 1.2 get list of node ids in the group
                distribution.local.groups.get(
                    msg.mrWorkerSContext.gid,
                    (e, nodeDict) => {
                      if (e) {
                        callback(e, null);
                        return;
                      }
                      let nid2NodeConfigs = new Map();
                      // {"507aa": {ip: "127.0.0.1", port: 8080}}
                      let nids = Object.values(nodeDict).map((nodeConfig) => {
                        let tempNid = distribution.util.id.getNID(nodeConfig);
                        nid2NodeConfigs.set(tempNid, nodeConfig);
                        return tempNid;
                      });
                      // 1.3. Decide which node store the object, based on kid
                      let chosenNid = msg.mrWorkerSContext.hash(kid, nids);
                      // 1.4. Invoke the corresponding method on that node.
                      let message = [
                        {[aggMapOutK]: aggMapOutV}, // [] to support dynamic key
                        {
                          key: 'shuffleOut',
                          mrWorkerSContext: msg.mrWorkerSContext,
                        },
                      ];
                      let remote = {
                        node: nid2NodeConfigs.get(chosenNid),
                        service: msg.mrWorkerSContext.mrWorkerSName,
                        method: 'recvShuffle',
                      };
                      distribution.local.comm.send(message, remote, (e, v) => {
                        currNResponses++;

                        if (currNResponses == Object.keys(aggMapOut).length) {
                          // 3.1. Shuffled + grouped all of worker's aggMapOut.
                          //      Update phase +
                          //      serviceCallback to coordinator (mr.exec)
                          msg.mrWorkerSContext.phase = msg.phase;
                          // update local variable
                          callback(e, v);
                          // (null, last currShuffleOut) on success
                        }
                      });
                    },
                );
              }
            },
        );
      } else if (msg.phase === 'reduce') {
        // if (msg.mrWorkerSContext.phase !== 'shuffle') {
        //   callback(new Error('not in shuffle when trying to start reduce',
        //   null));
        //   return;
        // }

        // 1. fetches relevant objects
        tempMemGet(
            {key: 'shuffleOut', gid: msg.mrWorkerSContext.gid},
            (e, shuffleOutObj) => {
            // shuffleOutObj = {1950, [0, 22, -11], 2000: [0]},

              if (e) { // can be null if nth happens to be allocated
                callback(e, null);
                return;
              }

              // 2. pass each key and corresponding object to the reduce
              // debugLog('retrievedShuffleOutObj', shuffleOutObj);
              let aggReduceOut = {};
              let valCounts = 0;
              for (const [shuffleOutK, shuffleOutVList] of Object.entries(
                  shuffleOutObj,
              )) {
                let reduceOut = msg.mrWorkerSContext.reduce(
                    shuffleOutK,
                    shuffleOutVList,
                ); // {1950: 22}
                aggReduceOut[Object.keys(reduceOut)[0]] =
                  reduceOut[Object.keys(reduceOut)[0]];
                // already grouped by keys (shouldn't have any duplicate)
                valCounts++;

                if (valCounts == Object.keys(shuffleOutObj).length) {
                  // 3. Has run reduce on all local values
                  //    update phase +
                  //    callback=serviceCallback to coordinator (mr.exec)
                  msg.mrWorkerSContext.phase = msg.phase;
                  // update local variable

                  // debugLog('aggReduceOut', aggReduceOut);
                  callback(null, aggReduceOut);
                  // {1950: 22, 2000: 0}
                }
              }
            },
        );
      } else {
        callback(new Error('[mr-id.notify] message phase not supported'), []);
      }
    },

    recvShuffle: (obj, msg, callback) => {
      /*
      To receive messages from shuffle & prepare input for reduce

      obj = {1950: [22, -11]} from { aggMapOutK: aggMapOutV } (only 1 key)
      msg = { key: "shuffleOut", mrWorkerSContext:_}
      */
      callback = callback || global.defaultCb;

      // S2. grouping: aggregate received values by key (shuffleOutK)

      // 2.1 Get current shuffle out
      tempMemGet(
          {key: msg.key, gid: msg.mrWorkerSContext.gid},
          (e, value) => {
            let currShuffleOut = value || {}; // {1950: [0], 2000: [0]}
            // 2.2 update it (or create it if first time)
            // if (e !== null) {
            //   currShuffleOut = {};
            // }

            let shuffleOutK = Object.keys(obj)[0];
            let shuffleOutV = obj[shuffleOutK]; // [1, 1, 1]

            if (!(shuffleOutK in currShuffleOut)) {
              currShuffleOut[shuffleOutK] = [];
            }
            currShuffleOut[shuffleOutK] =
            currShuffleOut[shuffleOutK].concat(shuffleOutV);
            // {1950, [0, 22, -11], 2000: [0]} - "append"

            // 2.3 Store it again under same key
            // debugLog('shuffleOutK', shuffleOutK);
            // debugLog('shuffleOutV', shuffleOutV);
            tempMemPut(
                currShuffleOut,
                {key: msg.key, gid: msg.mrWorkerSContext.gid},
                (e, v) => {
                  // debugLog('currShuffleOut',v);
                  callback(e, v); // (null, obj) on success
                  // serviceCallback to mr-id.notify in shuffle phase (3.1)
                },
            );
          },
      );
    },
  };
};

const mr = function(config) {
  let context = {};
  context.gid = config.gid || 'all';

  return {
    // function for coordinator only
    exec: (execConfig, callback) => {
      /*
      execConfig= keys: v, map: m2, reduce: r,2}
      (1) keys: list of keys of objects stored in the distributed storage system
      (2) map: function
      - Takes as input a key (typically the object key) +
        the value corresponding to that key.
      - Outputs a key which the reduce function will apply aggregation on
        (word, year) + a value corresponding to that key (counter, temperature)
      (3) reduce: function
      - Takes as input a key + the corresponding list of values
      - Outputs a map
      (4) Additional optional parameters: enabling in-memory storage,
          using special sorting, adding a combiner, limiting the number of
          reducers etc.
      */

      // keeps track of number of nodes it's expecting an answer from
      // + which phase nodes are in

      callback = callback || global.defaultCb;

      // (1) Setup
      // 1.1 creates a mr-id service for this invocation of mapReduce
      let mrWorkerSContext = {};
      mrWorkerSContext.gid = context.gid || 'all';
      mrWorkerSContext.phase = 'setup'; // setup, map, shuffle, reduce
      mrWorkerSContext.map = execConfig.map; // NOTE: could do mr-id.map instead
      mrWorkerSContext.reduce = execConfig.reduce;
      mrWorkerSContext.keys = execConfig.keys; // not really used as of now?
      mrWorkerSContext.hash = function(kid, nids) {
        // naiveHash
        nids.sort();
        return nids[distribution.util.id.idToNum(kid) % nids.length];
      };
      mrWorkerSContext.compact =
        execConfig.compact ||
        function(aggMapOut) {
          // aggMapOut = [{1950: 0}, {1950: 22}]; [{It: 1}, {It: 1}, {a: 1}]
          // cpctAggMapOut: {1950: [0, 22], 1000: [0]}; { It:[1,1], a:[1] }

          let cpctAggMapOut = {};
          for (let i = 0; i < aggMapOut.length; i++) {
            // aggMapOut[i] = {1950: 0} - just one key-value pair
            for (const [mapOutK, mapOutV] of Object.entries(aggMapOut[i])) {
              if (!(mapOutK in cpctAggMapOut)) {
                cpctAggMapOut[mapOutK] = [];
              }
              cpctAggMapOut[mapOutK].push(mapOutV);
            }
          }
          return cpctAggMapOut;
        };

      mrWorkerSContext.mrWorkerSName = 'mr-' + global.lastMRID.toString();
      let mrWorkerSService = mrWorkerS(mrWorkerSContext);
      // = {notify: fun, recvShuffle: fun}
      // TODO: add keys for use in fetching relevant objs in notify
      //  (use if statement)

      // 1.2 register mr-id on all nodes in the group
      //     (including coordinator itself)
      // NOTE: calls local.routes.put on each node, then mr-id.notify can be
      //       accessed through local.routes.get in listener loop for comm.send
      //       in node.js, but NOT distribution.group.mr-id (based on my
      //       local.routes.put implementation)
      distribution[context.gid].routes.put(
          mrWorkerSService,
          mrWorkerSContext.mrWorkerSName,
          (e, v) => {
          // knows setup has completed
            global.lastMRID++;

            // (2) Map
            // console.log(`!!! right before 2.map - v=${JSON.stringify(v)}`);
            // 2.1 initiate map phase of computation (+ compaction)
            distribution[context.gid].comm.send(
                [{phase: 'map', mrWorkerSContext: mrWorkerSContext}],
                {service: mrWorkerSContext.mrWorkerSName, method: 'notify'},
                (nodeErrors, nodeValues) => {
                  // Has received totalNNodes # of responses
                  // (all workers have finished map)
                  // nodeValues[nodeSID] = obj being written to file

                  // (2.5) shuffle
                  // console.log(`!!! right before 2.5 shuffle -
                  // nodeValues=${JSON.stringify(nodeValues)}`);
                  distribution[context.gid].comm.send(
                      [{phase: 'shuffle', mrWorkerSContext: mrWorkerSContext}],
                      {service: mrWorkerSContext.mrWorkerSName,
                        method: 'notify'},
                      (nodeErrors, nodeValues) => {
                        // all the workers done with shuffle

                        // (3) Reduce
                        // console.log(`!!! right before 3. reduce -
                        // (partial) nodeErrors=${JSON.stringify(nodeErrors)},
                        // nodeValues=${JSON.stringify(nodeValues)}`);

                        distribution[context.gid].comm.send(
                            [{phase: 'reduce',
                              mrWorkerSContext: mrWorkerSContext}],
                            {
                              service: mrWorkerSContext.mrWorkerSName,
                              method: 'notify',
                            },
                            (nodeErrors, nodeValues) => {
                              // console.log(`!!! right after 3. reduce -
                              // nodeErrors=${JSON.stringify(nodeErrors)},
                              // nodeValues=${JSON.stringify(nodeValues)}`);
                              // debugLog(
                              //     's-' +
                              //     distribution.util.id.getSID(nodeConfig),
                              //     'finalNodeValues',
                              //     nodeValues,
                              // );
                              callback(null, process(nodeValues));
                              // CHECK: async a problem?
                              // NOTE: created process() to deal with async
                            },
                        );
                      },
                  );
                },
            );
          },
      );
    },
  };
};

module.exports = mr;
