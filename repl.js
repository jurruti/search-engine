const repl = require('repl');
const groupsTemplate = require('./distribution/all/groups');
const distribution = require('./distribution');
const id = distribution.util.id;
//////////////////////////////////////////////////////////////////

/**
 * CONFIG SECTION
 */

// nodes in the system = EC2 instances
const n1 = {ip: '172.31.19.210', port: 8080};
const n2 = {ip: '172.31.24.240', port: 8080}
const n3 = {ip: '172.31.25.251', port: 8080};
const n4 = {ip: '172.31.26.178', port: 8080}
const workerGroup = {};
workerGroup[id.getSID(n1)] = n1;
workerGroup[id.getSID(n2)] = n2;
workerGroup[id.getSID(n3)] = n3;
workerGroup[id.getSID(n4)] = n4;
const workerConfig = {gid: 'worker'};
//////////////////////////////////////////////////////////////////

// SERVER
let localServer = null;
global.nodeConfig = {ip: '172.31.26.178', port: 8080};
distribution.node.start(onStart);

function onStart(server) {
  localServer = server;
}

function isEmptyObject(obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

function eval(cmd) {
  if (cmd === 'start') {
    return 'lets go';
  }
  if (cmd === 'id') {
    let id = 'async error';
    distribution.local.status.get('nid',(e,v)=>{
      id = v;
    });
    return id;
  }
  if (cmd === 'group') {
    groupsTemplate(workerConfig).put(workerConfig, workerGroup, (e, v) => {
      console.log(JSON.stringify(e));
      console.log(JSON.stringify(v));
      
    });
    return cmd;
  }
  if (cmd === 'gid') {
    distribution['worker'].status.get('nid', (e, v) => {
      console.log(JSON.stringify(e));
      console.log(JSON.stringify(v));
    });
    return cmd
  }
  if (cmd.slice(0,5) === 'store') {
    distribution['worker'].store.put('data1', cmd[5], (e,v) => {
      console.log(JSON.stringify(e));
      console.log(JSON.stringify(v));
    });
    return cmd
  }
  if (cmd.slice(0,3) === 'get') {
    distribution['worker'].store.get(cmd[3], (e,v) => {
      console.log(JSON.stringify(e));
      console.log(JSON.stringify(v));
    });
    return cmd
  }
  if (cmd === 'github') {
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
  }
  return 'no command'
}

async function waitForCondition(interval = 100) {
  while (localServer == null) {
      await new Promise(resolve => setTimeout(resolve, interval));
  }
  console.log('REPL STARTED');
}
waitForCondition();

// Start the REPL
repl.start({
    prompt: '> ',
    eval: (cmd, context, filename, callback) => {
        try {
            // Remove the newline character at the end of the command
            cmd = cmd.replace(/\n$/, '');
            
            // Evaluate the command and store the result
            let result = eval(cmd);

            // Send the result to the callback, with no error
            callback(null, result);
        } catch (e) {
            // If an error occurs, send the error to the callback
            callback(e);
        }
    }
});

