# HTML Includes

Commandline HTML compilation with partial includes. Useful for super quick templating, or perhaps bundling things into an iframe.

## "Aren't there a million of these?"

Yes. However, they _all_ miss at least one of the following requirements:

- No webpack necessary
- Glob folder support
- Watch
- Relative paths
- Minification
- Saving compiled files with ignoreable filenames
- Passing parameters to includes, like props to a component

## Install

    npm i --save-dev html-includes

Add the script into your `package.json` along the lines of:

    "scripts": {
      "compile": "html-includes --src src --dest dist"
    },

## Run

    npm run compile

## Use

Here is a typical example using the script parameters above:

#### src/index.html

```html
<html>
  <head>
    ${require('./_meta.html')}
  </head>
  <body>
    <main>
      ${require('./_main.html') foo="and you can also pass props"}
    </main>
  </body>
</html>
```

#### src/\_meta.html

```html
<meta meta="meta">
```

#### src/\_main.html

```html
<p>Main content ${props.foo}</p>
```

### Result

In `/dist` you'd have simply `index.html`, containing:

```html
<html>
<head>
  <meta meta="meta">
</head>
<body>
  <main>
    <p>Main content and you can also pass props</p>
  </main>
</body>
</html>
```

Or with the `--minify` flag, you'd get:

```html
<html><head><meta meta="meta"></head><body><main><p>Main content</p></main></body></html>
```

## Options

| Flag                        | Description                                                                                                                                          | Default                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `--watch`                   | Watch for file changes                                                                                                                               | false                  |
| `--minify`                  | Enable Minification of HTML                                                                                                                          | false                  |
| `--minify option=[boolean]` | Set any of the boolean options in https://github.com/kangax/html-minifier#options-quick-reference - for example `--minify conservativeCollapse=true` | Various typical values |

### Notes

- Filenames starting with an `_` underscore will not be saved into destination (in the style of partial files in Sass).
