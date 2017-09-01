# HTML Includes
Commandline HTML compilation with partial includes.

## "Aren't there a million of these?"
Yes. However, they _all_ miss one of the following requirements:

- No custom Node script necessary; CLI only
- Glob folder support
- Watch
- Relative paths

## Install

    npm i --save-dev html-includes

Add the script into your `package.json` along the lines of:

    "scripts": {
      "compile-html": "html-includes --src src --dest dist --watch"
    },

## Run

    npm run compile-html
