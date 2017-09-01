#! /usr/bin/env node
var shell = require('shelljs');
var cd = 'node_modules/html-includes/bin/';
shell.exec('node ' + cd + 'compile.js');
