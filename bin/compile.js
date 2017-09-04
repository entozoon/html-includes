const watch = require('node-watch'),
  commandLineArgs = require('command-line-args'),
  fs = require('fs'),
  glob = require('glob');

const options = [
  { name: 'watch', alias: 'w', type: Boolean },
  { name: 'src', alias: 's', type: String },
  { name: 'dest', alias: 'd', type: String }
];
const args = commandLineArgs(options);

const compile = args => {
  // console.log(args);

  glob(args.src + '/**/*.html', {}, (err, files) => {
    // console.log(files);
    if (err) {
      console.log(err);
      return;
    }
    if (!files) return;

    // Run through each .html file
    files.forEach(path => {
      // Parse includes! (even in _partial.html files)
      // ' include="_header.html">[injects here]</'
      // Match that ^ to allow for anything like:
      // <div include="_header.html"></div>
      // <div include="_header.html" ></div>
      // <span include="_header.html" class="hello"></span>
      // <include="_header.html"></>
      // <div include="_header.html">Full of junk that gets replaced</div>
      let regexOuter = / include="(.+)"(.*)>(.*)<\//g; // all occurrences
      let regexInclude = /include="(.*?)"/; // first occurrence
      let regexInner = />(.*?)</; // first occurrence

      fs.readFile(path, 'utf8', (err, content) => {
        // Match the outer element
        content = content.replace(regexOuter, match => {
          // Grab the intended filename to include
          let matchInclude = match;

          let contentUpdated = '';
          match.replace(regexInclude, match => {
            // (should _absolutely_ be using promises at this level but nah)
            match.replace(/"(.*?)"/, matchIncludeFile => {
              let includeFilename = matchIncludeFile.substring(1, matchIncludeFile.length - 1);
              // Allow relative includes. Are we having fun yet?
              let pathRelative = path.split('/').slice(0, -1).join('/');
              let includeFilepath = pathRelative + '/' + includeFilename;

              // Remove the include="" attribute and whitespace to some extent
              contentUpdated = ' ' + matchInclude.replace(regexInclude, '').trim();

              // Match the inner content to be replaced
              contentUpdated = contentUpdated.replace(regexInner, match => {
                //let content = 'almost there';
                let content = '';
                try {
                  content = fs.readFileSync(includeFilepath, 'utf8');
                } catch (e) {
                  console.log("ERROR  Couldn't find file: " + includeFilepath);
                }
                return '>' + content + '<';
              });
            });
          });

          return contentUpdated;
        });
        //console.log(content);

        // If _partial.html, don't actually output the file
        let filename = path.split('/');
        filename = filename[filename.length - 1];
        if (filename.substring(0, 1) != '_') {
          // Save the file to dist
          let filename = path.split('/').pop();
          let outputFilepath = args.dest + '/' + filename;
          console.log('Saving: ' + path + '-> ' + outputFilepath);

          fs.writeFile(outputFilepath, content, err => {
            if (err) {
              return console.log(err);
            }
          });
        }
      });
    });
  });
};

// Run on init
compile(args);

// Watch for changes with flag --watch
if (args.watch) {
  watch(
    './src/html/',
    {
      recursive: true,
      filter: /\.html$/
    },
    function(evnt, file) {
      if (evnt === 'update') {
        compile(args);
      }
    }
  );
}
