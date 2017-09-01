#! /usr/bin/env node
var shell = require('shelljs');
var cd = 'node_modules/html-includes/bin/';

// Pass args through to compile script
let args = process.argv.splice(2).join(' ');

shell.exec('node ' + cd + 'compile.js ' + args);
