# HTML Includes
Commandline HTML compilation with partial includes.

## "Aren't there a million of these?"
Yes. However, they _all_ miss one of the following requirements:

- No custom Node script necessary; CLI only
- Glob folder support
- Watch
- Relative paths
- Saving compiled files with ignoreable filenames

## Install

    npm i --save-dev html-includes

Add the script into your `package.json` along the lines of:

    "scripts": {
      "compile-html": "html-includes --src src --dest dist --watch"
    },

## Run

    npm run compile-html

## Use

Here is a typical example using the script parameters above

### src/index.html

    <p>Hello</p>
    <div include="_footer.html"></div>


### src/_footer.html

    <p>Footer stuff</p>

### RESULT
In `/dist` you'd only have `index.html`, containing:

    <p>Hello</p>
    <p>Footer stuff</p>

### Notes

- Filenames starting with an `_` underscore will not be saved into destination - similar to partial files in Sass.
- You can treat the include as a typical element, as it simply injects the partial, i.e.:


    <span include="_header.html" class="stays-put">GETS REPLACED</span>
