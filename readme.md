# Simple child

A real simple child process module

install:
```bash
$ npm i simple-child
```

usage:
```javascript
var SimpleChild = require('simple-child')
var child = new SimpleChild('node ./cmd.js' /*, {options} */)

child.start(/* callback */)

child.restart(/* callback */)

child.stop(/* callback */)
```

it's  as simple as that.

However there is scope for more...
```javascript
myFunkyStream
  .pipe(new SimpleChild('node ./cmd.js').start())
  .pipe(process.stdout)
```
In this example it would pipe the output from `myFunkyStream` to the child process via `process.stdin` and pipe out anything, which is written to `process.stdout` or `process.stderr` inside the child to our outter `process.stdout` !!

