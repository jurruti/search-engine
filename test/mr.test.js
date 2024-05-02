global.nodeConfig = {ip: '172.31.26.178', port: 8080};
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

const n1 = {ip: '172.31.19.210', port: 8080};
const n2 = {ip: '172.31.25.251', port: 8080};
const n3 = {ip: '172.31.24.240', port: 8080};

jest.setTimeout(30000);
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
test('searchPreprocessing workflow', async () => {
  // Act as the coordinator
  const dataset = await distribution.util.crawl.fetchRepos(1, 100);

  const doMapReduce = async () => {
    return new Promise((resolve, reject) => {
      distribution.groupA.store.get(null, async (e, v) => {
        distribution.groupA.mr.exec({
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
            expect(value.length>0).toEqual(true);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  };

  let cntr = 0;

  await new Promise((resolve, reject) => {
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
});
