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
  regexFilesId = /\${filesId\((.*?)\)[^}]*\}/,
  regexPropAttrs = /\b([^\s]+)="[^\"]*"/gi,
  regexPropUsage = /\$\{props.[^}]+\}/g,
  maxNestedDepth = 99;

// Grab CLI arguments
const options = [
  { name: "watch", alias: "w", type: String, multiple: true },
  { name: "src", alias: "s", type: String, defaultValue: "src" },
  { name: "dest", alias: "d", type: String, defaultValue: "dist" },
  { name: "minify", alias: "m", type: String, multiple: true },
  { name: "quiet", alias: "q", type: String, defaultValue: false },
];
const args = commandLineArgs(options);

const randomIdent = () =>
  "xxxHTMLLINKxxx" + Math.random() + Math.random() + "xxx";

// // e.g. ("./_sub.html", "src/index.html",) => "..../src/./_sub.html"
const getFilesId = (fileRequest, fileCurrent, filesHtml) => {
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

  // Resolve any parent selectors, e.g:
  // src/component/../../_above.html
  // _above.html
  let split = path.split("/");
  while (split.includes("..")) {
    split.forEach((s, i) => {
      if (s === "..") {
        if (i == 0) {
          console.error(
            `\n SORRY: Cannot include a file above the main directory\n`
          );
          split.splice(i, 1); // erroring it out of the while loop
        }
        split.splice(i - 1, 2);
      }
    });
  }
  path = split.join("/");

  // Get matching entry from files array
  let filez = filesHtml.filter((f) => f.path == path);
  // console.log(fileRequest, fileCurrent, " => ", path);
  // console.log(filez[0] ? filez[0].id : "NOT FOUND");
  return filez[0] ? filez[0].id : null;
};

const compile = (args) => {
  glob(args.src + "/**/*", { ignore: "**/node_modules/**/*" }, (err, files) => {
    if (err) {
      console.log(err);
      return;
    }

    // Set IDs for files
    files = files.map((path, id) => {
      return {
        id,
        path,
      };
    });
    let filesHtml = files.filter(({ path }) => path.substr(-5) === ".html");
    // Grab contents from aaall the (html) things, i.e. get the lead out
    filesHtml = filesHtml.map((f) => {
      f.content = fs.readFileSync(f.path, "utf8");
      return f;
    });
    if (!filesHtml) return;

    let noMoreJobs = false,
      loopCount = 0;
    // Whip round all the files, replacing any ${require()} with ${requireRel()} full path
    while (!noMoreJobs && loopCount < maxNestedDepth) {
      noMoreJobs = true; // hopeful
      filesHtml = filesHtml.map((file) => {
        if (file.content.match(regexInclude)) {
          noMoreJobs = false; // ah well, press on
          file.content = file.content.replace(regexInclude, (require) => {
            let requirePath = require.match(regexIncludeFilePath)[1];
            // console.log({ requirePath, f: file.path, files });

            let filesId = getFilesId(requirePath, file.path, files);
            //
            // PROPS Passing
            //
            // Get any prop values and pass them through as before
            // [ 'foo="bar"', 'baz="jizz"' ]
            let propsAttrs = require.match(regexPropAttrs);
            // console.log(propsAttrs);

            if (filesId === null) {
              console.error(
                `\n FILE MISSING: ${requirePath} (requested by ${file.path})\n`
              );
            }

            return (
              "${filesId(" +
              filesId +
              ")" +
              (propsAttrs ? " " + propsAttrs.join(" ") : "") +
              "}"
            );
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
      filesHtml = filesHtml.map((file) => {
        if (file.content.match(regexFilesId)) {
          noMoreJobs = false; // ah well, press on
          file.content = file.content.replace(regexFilesId, (require) => {
            let filesId = require.match(regexFilesId)[1];
            // Get content from (mutated) files array (preeeetty sure it must exist)
            // console.log(filesHtml);
            let _file = files.filter((f) => f.id == filesId)[0];
            if (!_file) {
              // Shouldn't get to this point, it'll error in block above, but JIC bitch out
              return;
            }
            // If content isn't loaded, it's probably not a .html file so let's straight up read and inject
            if (!_file.content) {
              return fs.readFileSync(_file.path, "utf8");
            }
            let filesContent = _file.content;
            //
            // PROPS Injection
            //
            // Get props inline attributes
            let propsAttrs = require.match(regexPropAttrs);
            if (propsAttrs) {
              let props = [];
              // Convert props into a usable array
              propsAttrs.forEach((prop) => {
                let pair = prop.split("=");
                props[pair[0]] = pair[1].substring(1, pair[1].length - 1);
              });
              // Replace any prop usages in the content with the passed prop
              filesContent = filesContent.replace(regexPropUsage, (match) => {
                // Sometimes I like the way I code; KISS Method
                let propKey = match.substring(
                  "${props.".length,
                  match.length - "}".length
                );
                return props[propKey] ? props[propKey] : "";
              });
            }

            // return require;
            return filesContent;
          });
        }
        return file;
      });
      loopCount++;
    }

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
        removeStyleTypeAttribute: true,
      };
      // --minify foo bar
      if (args.minify && args.minify.length) {
        args.minify.forEach((arg) => {
          arg = arg.split("=");
          minimizeOptions[arg[0]] = arg[1] == "false" ? false : true;
        });
      }
    }

    //
    // WRITE TO DIST
    //
    // If _partial.html, don't actually output the file
    filesHtml.forEach((file) => {
      let filename = file.path.split("/");
      filename = filename[filename.length - 1];
      if (filename.substring(0, 1) != "_") {
        // Save the file to dist
        let filename = file.path.substring(args.src.length);
        let outputFilePath = args.dest + filename;
        if (args.quiet === false) {
          console.log("Saving: " + file.path + "-> " + outputFilePath);
        }

        file.content = minimizeOptions
          ? htmlMinifier.minify(file.content, minimizeOptions)
          : file.content;

        fse.outputFile(outputFilePath, file.content, (err) => {
          if (err) {
            return console.log(err);
          }
        });
      }
    });
  });
};

// Run on init
compile(args);

// Watch for changes with flag of --watch
if (typeof args.watch != "undefined") {
  if (args.watch == null || !args.watch.length) args.watch = args.src;
  watch(
    args.watch,
    {
      recursive: true,
      // filter: /\.html$/
    },
    function (evnt, file) {
      if (evnt === "update") {
        compile(args);
      }
    }
  );
}
