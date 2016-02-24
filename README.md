# AMD MathJax

 - version of MathJax 2.6.1

This repository provides you a bundled version of MathJax that is AMD compliant. The bundle is about 1.3MB but contains everything when the formal version loads assets on demand. 

## Rebuild

### First time

```sh
npm install
```

### Build

```sh
grunt amdify
grunt build
```

(do not run `grunt amdify build`)

Then the assets are produced in the `dist` folder.


