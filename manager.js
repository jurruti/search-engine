
global.nodeConfig = {ip: '172.31.26.178', port: 8080};

const distribution = require('./distribution');
const path = require('path');
const fs = require('fs');
const {convert} = require('html-to-text')
const id = distribution.util.id;
distribution.node.start((server)=>{
     const nodes = {

global.nodeConfig = {ip: '172.31.26.178', port: 8080, onStart: () => {
  const nodes = {

  "node1": {ip: '172.31.19.210', port: 8080},
  "node2": {ip: '172.31.24.240', port: 8080},
  "node3": {ip: '172.31.25.251', port: 8080}
  };
  message = ["browncs", nodes];

  for (let [nodeName, nodeDetails] of Object.entries(nodes)) {
    console.log(nodeDetails);
    remote = {node: nodeDetails, service: 'groups', method: 'put'};

  for (var node in nodes) {
    remote = {node: node, service: 'groups', method: 'put'};


    distribution.local.comm.send(message, remote, (e,v) => {
        if (!e) {
            console.log(v);
        } else {
            console.log(e);
        }
    })

  const node = {ip: '172.31.25.251', port: 8080};
    message = [
    'nid', // configuration
    ];
    remote = {node: node, service: 'status', method: 'get'};
    distribution.local.comm.send(message, remote, (e,v) => {
        if (!e) {
            console.log(v);
        } else {
            console.log(e);
        }
    })
}
});
  }

}};

const distribution = require('./distribution');
const path = require('path');
const fs = require('fs');
const {convert} = require('html-to-text');

const id = distribution.util.id;
