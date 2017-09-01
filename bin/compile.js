const watch = require('node-watch'),
  fs = require('fs');

watch(
  './src/html/',
  {
    recursive: true,
    filter: /\.html$/
  },
  function(evt, name) {
    if (evt === 'update') {
      console.log(name);
    }
  }
);
