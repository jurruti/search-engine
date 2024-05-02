global.nodeConfig = {ip: '172.31.26.178', port: 8080, onStart: () => {
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
}};


const distribution = require('./distribution');
const path = require('path');
const fs = require('fs');
const {convert} = require('html-to-text');

const id = distribution.util.id;


