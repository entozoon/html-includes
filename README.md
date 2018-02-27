# HTML Includes

Commandline HTML compilation with partial includes. Useful for super quick templating, or perhaps bundling things into an iframe.

## "Aren't there a million of these?"

Yes. However, they _all_ miss one of the following requirements:

* No custom Node script necessary; CLI only
* Glob folder support
* Watch
* Relative paths
* Saving compiled files with ignoreable filenames

## Install

    npm i --save-dev html-includes

Add the script into your `package.json` along the lines of:

    "scripts": {
      "compile:html": "html-includes --src src --dest dist --watch"
    },

## Run

    npm run compile:html

## Use

Here is a typical example using the script parameters above

### src/index.html

As you can see there are two types of include:

* `<include>` - Which has its entire tag replaced
* `<element include>` - Which retains its given tag and other attributes

```html
<html>
    <head>
        <include src="_meta.html"></include>
    </head>
    <body>
        <main><include src="_main.html"></include></main>
        <footer include src="_footer.html"></footer>
    </body>
</html>
```

### src/\_meta.html

```html
<meta meta="meta"/>
```

### src/\_main.html

```html
<p>Main content</p>
```

### src/\_footer.html

```html
<p>Footer content</p>
```

### Result

In `/dist` you'd only have `index.html`, containing a minified version of:

```html
<html>
    <head>
        <meta meta="meta"/>
    </head>
    <body>
        <main><p>Main content</p></main>
        <footer><p>Footer content</p></footer>
    </body>
</html>
```

### Notes

* Filenames starting with an `_` underscore will not be saved into destination - similar to partial files in Sass.
