global.nodeConfig = {ip: '127.0.0.1', port: 7070};
const distribution = require('../distribution');
const id = distribution.util.id;

const groupsTemplate = require('../distribution/all/groups');

const ncdcGroup = {};
const dlibGroup = {};
const groupA = {};

/*
   This hack is necessary since we can not
   gracefully stop the local listening node.
   The process that node is
   running in is the actual jest process
*/
let localServer = null;

/*
    The local node will be the orchestrator.
*/

const n1 = {ip: '127.0.0.1', port: 7110};
const n2 = {ip: '127.0.0.1', port: 7111};
const n3 = {ip: '127.0.0.1', port: 7112};

beforeAll((done) => {
  /* Stop the nodes if they are running */

  ncdcGroup[id.getSID(n1)] = n1;
  ncdcGroup[id.getSID(n2)] = n2;
  ncdcGroup[id.getSID(n3)] = n3;

  dlibGroup[id.getSID(n1)] = n1;
  dlibGroup[id.getSID(n2)] = n2;
  dlibGroup[id.getSID(n3)] = n3;

  groupA[id.getSID(n1)] = n1;
  groupA[id.getSID(n2)] = n2;
  groupA[id.getSID(n3)] = n3;

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

    const ncdcConfig = {gid: 'ncdc'};
    startNodes(() => {
      groupsTemplate(ncdcConfig).put(ncdcConfig, ncdcGroup, (e, v) => {
        const dlibConfig = {gid: 'dlib'};
        groupsTemplate(dlibConfig).put(dlibConfig, dlibGroup, (e, v) => {
          const groupCConfig = {gid: 'groupA'};
          groupsTemplate(groupCConfig).put(groupCConfig, groupA, (e, v) => {
            done();
          });
        });
      });
    });
  });
});

afterAll((done) => {
  let remote = {service: 'status', method: 'stop'};
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        localServer.close();
        done();
      });
    });
  });
});

function sanityCheck(mapper, reducer, dataset, expected, done) {
  let mapped = dataset.map((o) =>
    mapper(Object.keys(o)[0], o[Object.keys(o)[0]]));
  /* Flatten the array. */
  mapped = mapped.flat();
  let shuffled = mapped.reduce((a, b) => {
    let key = Object.keys(b)[0];
    if (a[key] === undefined) a[key] = [];
    a[key].push(b[key]);
    return a;
  }, {});
  let reduced = Object.keys(shuffled).map((k) => reducer(k, shuffled[k]));

  try {
    expect(reduced).toEqual(expect.arrayContaining(expected));
  } catch (e) {
    done(e);
  }
}


test('crawler workflow', (done) => {
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

  const dataset = [
    {'Google': 'https://www.google.com'},
    {'LinkedIn': 'https://www.linkedin.com'},
  ];

  const expected = [{Google: ['stored']}, {LinkedIn: ['stored']}];

  const doMapReduce = (cb) => {
    distribution.groupA.store.get(null, (e, v) => {
      try {
        expect(v.length).toBe(dataset.length);
      } catch (e) {
        setTimeout(() => done(e), 2000);
        return;
      }

      distribution.groupA.mr.exec({keys: v, map: m2, reduce: r2}, (e, v) => {
        console.log('mr result', e, v);
        if (e) {
          done(e);
          return;
        }

        try {
          expect(v).toEqual(expect.arrayContaining(expected));
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  };

  let cntr = 0;

  // We send the dataset to the cluster
  dataset.forEach((o) => {
    let key = Object.keys(o)[0];
    let value = o[key];
    distribution.groupA.store.put(value, key, (e, v) => {
      cntr++;
      // Once we are done, run the map reduce
      if (cntr === dataset.length) {
        doMapReduce();
      }
    });
  });
});

