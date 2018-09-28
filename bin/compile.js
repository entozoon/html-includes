const watch = require("node-watch"),
  commandLineArgs = require("command-line-args"),
  fs = require("fs"),
  fse = require("fs-extra"),
  glob = require("glob"),
  htmlMinifier = require("html-minifier");
//   cheerio = require("cheerio")
//   htmlLoader = require("html-loader")
//   loaderUtils = require("loader-utils");

const options = [
  { name: "watch", alias: "w", type: String, multiple: true },
  { name: "src", alias: "s", type: String },
  { name: "dest", alias: "d", type: String },
  { name: "minify", alias: "m", type: String, multiple: true }
];
const args = commandLineArgs(options);

const getContent = (path, filename) => {
  // Allow relative includes. Are we having fun yet?
  let pathRelative = path
    .split("/")
    .slice(0, -1)
    .join("/");
  let includeFilepath = pathRelative + "/" + filename;

  let content = "";
  try {
    content = fs.readFileSync(includeFilepath, "utf8");
  } catch (e) {
    console.log("ERROR  Couldn't find file: " + includeFilepath);
  }

  return content;
};

function randomIdent() {
  return "xxxHTMLLINKxxx" + Math.random() + Math.random() + "xxx";
}

const compile = args => {
  // console.log(args);

  glob(args.src + "/**/*.html", {}, (err, files) => {
    if (err) {
      console.log(err);
      return;
    }
    if (!files) return;

    files.forEach(path => {
      console.log("Reading:", path);
      let content = fs.readFileSync(path, "utf8");

      //
      // Shamelessly inspired by webpack's html-loader
      // https://github.com/webpack-contrib/html-loader/blob/master/index.js#L80
      //
      // Replace all ${require('./_foo.html')}
      // style occurrences with a random string
      var data = {};
      var reg = /\$\{require\([^)]*\)[^}]*\}/g;
      //   console.log(reg.exec(content));
      var result;
      var reqList = [];
      let props = {};
      while ((result = reg.exec(content))) {
        reqList.push({
          length: result[0].length,
          start: result.index,
          value: result[0]
        });
      }
      reqList.reverse();
      content = [content];
      reqList.forEach(function(link) {
        var x = content.pop();
        do {
          var ident = randomIdent();
        } while (data[ident]);
        // data[ident] = link.value.substring(11, link.length - 3);
        // Sprinkling some myke magic to allow flexibility for adding other attributes as params
        data[ident] = /\([^)]*\)/g.exec(link.value)[0].slice(2, -2);
        content.push(x.substr(link.start + link.length));
        content.push(ident);
        content.push(x.substr(0, link.start));
        // Get any prop values
        // [ 'foo="bar"', 'baz="jizz"' ]
        let propList = link.value.match(/\b([^\s]+)(="(^'|^"|[^\s]+)*")/gi);
        if (propList) {
          propList.forEach(prop => {
            let pair = prop.split("=");
            props[pair[0]] = pair[1].substring(1, pair[1].length - 1);
          });
        }
      });
      content.reverse();
      content = content.join("");
      //
      // Replace all the random strings with the read file
      //
      content = content.replace(/xxxHTMLLINKxxx[0-9\.]+xxx/g, match => {
        if (!data[match]) return match;

        let root = path.split("/");
        root.pop();
        root = root.join("/") + "/";

        let filePath = root + data[match];

        return fs.readFileSync(filePath, "utf8");
      });

      content = content.replace(/\$\{props.[^}]+\}/g, match => {
        // Sometimes I like the way I code; KISS Method
        let propKey = match.substring(
          "${props.".length,
          match.length - "}".length
        );
        return props[propKey] ? props[propKey] : "";
      });

      //
      // Minify
      //
      // --minify
      if (typeof args.minify != "undefined") {
        let minimizeOptions = {
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
        if (args.minify.length) {
          args.minify.forEach(arg => {
            arg = arg.split("=");
            minimizeOptions[arg[0]] = arg[1] == "false" ? false : true;
          });
        }

        content = htmlMinifier.minify(content, minimizeOptions);
      }

      // If _partial.html, don't actually output the file
      let filename = path.split("/");
      filename = filename[filename.length - 1];
      if (filename.substring(0, 1) != "_") {
        // Save the file to dist
        console.log(path.substring(args.src.length));
        // let filename = path.split("/").pop();
        let filename = path.substring(args.src.length);
        let outputFilepath = args.dest + filename;
        console.log("Saving: " + path + "-> " + outputFilepath);

        fse.outputFile(outputFilepath, content, err => {
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
