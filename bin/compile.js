const watch = require("node-watch"),
  commandLineArgs = require("command-line-args"),
  fs = require("fs"),
  fse = require("fs-extra"),
  glob = require("glob"),
  htmlMinifier = require("html-minifier"),
  regexInclude = /\$\{require\([^)]*\)[^}]*\}/g,
  // regexIncludeRel = /\$\{requireRel\([^)]*\)[^}]*\}/g,
  // regexIncludeFilePath = /\$\{require\((^\))+\)/g,
  regexIncludeFilePath = /\${require\(\'(.*?)\'\)/,
  regexFilesId = /\${filesId\((.*?)\)\}/,
  maxNestedDepth = 99;

// Grab CLI arguments
const options = [
  { name: "watch", alias: "w", type: String, multiple: true },
  { name: "src", alias: "s", type: String, defaultValue: "src" },
  { name: "dest", alias: "d", type: String, defaultValue: "dist" },
  { name: "minify", alias: "m", type: String, multiple: true }
];
const args = commandLineArgs(options);

// const getContent = (path, filename) => {
//   // Allow relative includes. Are we having fun yet?
//   let pathRelative = path
//     .split("/")
//     .slice(0, -1)
//     .join("/");
//   let includeFilePath = pathRelative + "/" + filename;

//   let content = "";
//   try {
//     content = fs.readFileSync(includeFilePath, "utf8");
//   } catch (e) {
//     console.log("ERROR  Couldn't find file: " + includeFilePath);
//   }

//   return content;
// };

const randomIdent = () =>
  "xxxHTMLLINKxxx" + Math.random() + Math.random() + "xxx";

// // e.g. ("./_sub.html", "src/index.html",) => "..../src/./_sub.html"
// const getRelativeFilePath = (fileRequest, fileCurrent) => {
//   console.log(fileRequest, fileCurrent);
//   // Absolute -> rel (why not, eh?)
//   if (fileRequest.substring(0, 1) == "/")
//     return __dirname + "/../../../" + args.src + fileRequest;
//   let dir = fileCurrent.split("/");
//   dir.pop();
//   dir = dir.join("/");
//   return __dirname + "/../../../" + dir + "/" + fileRequest;
// };

// // e.g. ("./_sub.html", "src/index.html",) => "..../src/./_sub.html"
const getFilesId = (fileRequest, fileCurrent, files) => {
  let path;
  if (fileRequest.substring(0, 1) == "/") {
    // Absolute
    path = args.src + fileRequest;
  } else {
    // Rel
    let dir = fileCurrent.split("/");
    dir.pop();
    dir = dir.join("/");
    path =
      dir +
      "/" +
      (fileRequest.substring(0, 2) == `./`
        ? fileRequest.substring(2)
        : fileRequest);
  }
  // Get matching entry from files array
  let filez = files.filter(f => f.path == path);
  // console.log(fileRequest, fileCurrent, " => ", path);
  // console.log(filez[0] ? filez[0].id : "NOT FOUND");
  return filez[0] ? filez[0].id : null;
};

const compile = args => {
  console.log("\033[2J");

  glob(args.src + "/**/*.html", {}, (err, files) => {
    if (err) {
      console.log(err);
      return;
    }
    if (!files) return;

    // Grab contents from aaall the things, i.e. get the lead out
    files = files.map((path, i) => {
      return { id: i, path, content: fs.readFileSync(path, "utf8") };
    });

    // Try and support nested includes, here we go!
    // let noMoreJobs = false,
    //   loopCount = 0;
    // // Whip round all the files, replacing any ${require()} with ${requireRel()} full path
    // while (!noMoreJobs && loopCount < maxNestedDepth) {
    //   noMoreJobs = true; // hopeful
    //   files = files.map(file => {
    //     if (file.content.match(regexInclude)) {
    //       noMoreJobs = false; // ah well, press on
    //       file.content = file.content.replace(regexInclude, require => {
    //         let includeFilePath = getRelativeFilePath(
    //           require.match(regexIncludeFilePath)[1],
    //           file.path
    //         );
    //         return "${requireRel('" + includeFilePath + "')}";
    //       });
    //     }
    //     return file;
    //   });
    //   loopCount++;
    // }
    let noMoreJobs = false,
      loopCount = 0;
    // Whip round all the files, replacing any ${require()} with ${requireRel()} full path
    while (!noMoreJobs && loopCount < maxNestedDepth) {
      noMoreJobs = true; // hopeful
      files = files.map(file => {
        if (file.content.match(regexInclude)) {
          noMoreJobs = false; // ah well, press on
          file.content = file.content.replace(regexInclude, require => {
            let filesId = getFilesId(
              require.match(regexIncludeFilePath)[1],
              file.path,
              files
            );
            return "${filesId(" + filesId + ")}";
          });
        }
        return file;
      });
      loopCount++;
    }
    // Whip round the files once again, injecting content
    noMoreJobs = false;
    loopCount = 0;
    while (!noMoreJobs && loopCount < maxNestedDepth) {
      noMoreJobs = true; // hopeful
      files = files.map(file => {
        if (file.content.match(regexFilesId)) {
          noMoreJobs = false; // ah well, press on
          file.content = file.content.replace(regexFilesId, require => {
            // Replace with it's relative file while shoving in any props *************
            // let includeFilePath = require.match(regexIncludeFilePathRel)[1];
            // console.log(includeFilePath);
            let filesId = require.match(regexFilesId)[1];
            // Get content from (mutated) files array (preeeetty sure it must exist)
            let filesContent = files.filter(f => f.id == filesId)[0].content;
            // return require;
            return filesContent;
          });
        }
        return file;
      });
      loopCount++;
    }

    //
    // PROPS
    //

    //
    // MINIFICATION
    // --minify
    let minimizeOptions = false;
    if (typeof args.minify != "undefined") {
      minimizeOptions = {
        removeComments: true,
        removeCommentsFromCDATA: true,
        removeCDATASectionsFromCDATA: true,
        collapseWhitespace: true,
        conservativeCollapse: false,
        removeAttributeQuotes: false,
        useShortDoctype: true,
        keepClosingSlash: true,
        minifyJS: false,
        minifyCSS: true,
        removeScriptTypeAttributes: true,
        removeStyleTypeAttribute: true
      };
      // --minify foo bar
      if (args.minify && args.minify.length) {
        args.minify.forEach(arg => {
          arg = arg.split("=");
          minimizeOptions[arg[0]] = arg[1] == "false" ? false : true;
        });
      }
    }

    //
    // WRITE TO DIST
    //
    // If _partial.html, don't actually output the file
    files.forEach(file => {
      let filename = file.path.split("/");
      filename = filename[filename.length - 1];
      if (filename.substring(0, 1) != "_") {
        // Save the file to dist
        let filename = file.path.substring(args.src.length);
        let outputFilePath = args.dest + filename;
        console.log("Saving: " + file.path + "-> " + outputFilePath);

        file.content = minimizeOptions
          ? htmlMinifier.minify(file.content, minimizeOptions)
          : file.content;

        fse.outputFile(outputFilePath, file.content, err => {
          if (err) {
            return console.log(err);
          }
        });
      }
    });

    // files.forEach(path => {
    //   console.log("Reading:", path);
    //   let content = fs.readFileSync(path, "utf8");

    //   //
    //   // Shamelessly inspired by webpack's html-loader
    //   // https://github.com/webpack-contrib/html-loader/blob/master/index.js#L80
    //   //
    //   // Replace all ${require('./_foo.html')}
    //   // style occurrences with a random string
    //   var data = {};
    //   var result;
    //   var reqList = [];
    //   let props = {};
    //   while ((result = regexInclude.exec(content))) {
    //     reqList.push({
    //       length: result[0].length,
    //       start: result.index,
    //       value: result[0]
    //     });
    //   }
    //   reqList.reverse();
    //   content = [content];
    //   reqList.forEach(function(link) {
    //     var x = content.pop();
    //     do {
    //       var ident = randomIdent();
    //     } while (data[ident]);
    //     // Sprinkling some myke magic to allow flexibility for adding other attributes as params
    //     data[ident] = /\([^)]*\)/g.exec(link.value)[0].slice(2, -2);
    //     content.push(x.substr(link.start + link.length));
    //     content.push(ident);
    //     content.push(x.substr(0, link.start));
    //     // Get any prop values
    //     // [ 'foo="bar"', 'baz="jizz"' ]
    //     let propList = link.value.match(/\b([^\s]+)(="(^'|^"|[^\s]+)*")/gi);
    //     if (propList) {
    //       propList.forEach(prop => {
    //         let pair = prop.split("=");
    //         props[pair[0]] = pair[1].substring(1, pair[1].length - 1);
    //       });
    //     }
    //   });
    //   content.reverse();
    //   content = content.join("");
    //   //
    //   // Replace all the random strings with the read file
    //   //
    //   content = content.replace(/xxxHTMLLINKxxx[0-9\.]+xxx/g, match => {
    //     if (!data[match]) return match;

    //     let root = path.split("/");
    //     root.pop();
    //     root = root.join("/") + "/";

    //     let filePath = root + data[match];

    //     return fs.readFileSync(filePath, "utf8");
    //   });

    //   content = content.replace(/\$\{props.[^}]+\}/g, match => {
    //     // Sometimes I like the way I code; KISS Method
    //     let propKey = match.substring(
    //       "${props.".length,
    //       match.length - "}".length
    //     );
    //     return props[propKey] ? props[propKey] : "";
    //   });

    //   //
    //   // Minify
    //   //
    //   // --minify
    //   if (typeof args.minify != "undefined") {
    //     let minimizeOptions = {
    //       removeComments: true,
    //       removeCommentsFromCDATA: true,
    //       removeCDATASectionsFromCDATA: true,
    //       collapseWhitespace: true,
    //       conservativeCollapse: false,
    //       removeAttributeQuotes: false,
    //       useShortDoctype: true,
    //       keepClosingSlash: true,
    //       minifyJS: false,
    //       minifyCSS: true,
    //       removeScriptTypeAttributes: true,
    //       removeStyleTypeAttribute: true
    //     };

    //     // --minify foo bar
    //     if (args.minify.length) {
    //       args.minify.forEach(arg => {
    //         arg = arg.split("=");
    //         minimizeOptions[arg[0]] = arg[1] == "false" ? false : true;
    //       });
    //     }

    //     content = htmlMinifier.minify(content, minimizeOptions);
    //   }

    //   // If _partial.html, don't actually output the file
    //   let filename = path.split("/");
    //   filename = filename[filename.length - 1];
    //   if (filename.substring(0, 1) != "_") {
    //     // Save the file to dist
    //     console.log(path.substring(args.src.length));
    //     let filename = path.substring(args.src.length);
    //     let outputFilePath = args.dest + filename;
    //     console.log("Saving: " + path + "-> " + outputFilePath);

    //     fse.outputFile(outputFilePath, content, err => {
    //       if (err) {
    //         return console.log(err);
    //       }
    //     });
    //   }
    // });
  });
};

// Run on init
compile(args);

// Watch for changes with flag --watch
if (typeof args.watch != "undefined") {
  if (args.watch == null || !args.watch.length) args.watch = args.src;
  watch(
    args.watch,
    {
      recursive: true
      // filter: /\.html$/
    },
    function(evnt, file) {
      if (evnt === "update") {
        compile(args);
      }
    }
  );
}
