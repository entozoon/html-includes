const watch = require("node-watch"),
  commandLineArgs = require("command-line-args"),
  fs = require("fs"),
  glob = require("glob"),
  cheerio = require("cheerio");

const options = [
  { name: "watch", alias: "w", type: String, multiple: true },
  { name: "src", alias: "s", type: String },
  { name: "dest", alias: "d", type: String }
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

const compile = args => {
  // console.log(args);

  glob(args.src + "/**/*.html", {}, (err, files) => {
    // console.log(files);
    if (err) {
      console.log(err);
      return;
    }
    if (!files) return;

    files.forEach(path => {
      console.log("Reading:", path);
      let content = fs.readFileSync(path, "utf8");

      const $ = cheerio.load(content, {
        normalizeWhitespace: true,
        xmlMode: true
      });

      //
      // <include src="_meta.html"></include>
      //
      $("include").replaceWith((i, $element) => {
        console.log("Including:", $element.attribs.src);
        return getContent(path, $element.attribs.src);
      });

      //
      // <main include src="_content.html"></main>
      //
      $("[include]").html("REPLACE CONTENT");
      $("[include]").each((i, $element) => {
        return "replaced????";
      });

      $("[include]").replaceWith((i, $element) => {
        // console.log($element.name);
        // console.log($element.attribs);

        // This _should_ be the way to do it, but no dice.
        // $element.html("REPLACED?");
        // return $element;

        let attributes = "";
        for (let key in $element.attribs) {
          if (!["include", "src"].includes(key)) {
            attributes += ` ${key}="${$element.attribs[key]}"`;
          }
        }

        return `<${$element.name}${attributes}>${getContent(
          path,
          $element.attribs.src
        )}</${$element.name}>`;
      });

      // // DEBUGGING
      //   if (path === "src/index.html") {
      //     console.log($.html());
      //   }

      // If _partial.html, don't actually output the file
      let filename = path.split("/");
      filename = filename[filename.length - 1];
      if (filename.substring(0, 1) != "_") {
        // Save the file to dist
        let filename = path.split("/").pop();
        let outputFilepath = args.dest + "/" + filename;
        console.log("Saving: " + path + "-> " + outputFilepath);

        fs.writeFile(outputFilepath, $.html(), err => {
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