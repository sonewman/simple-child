module.exports = SimpleChild

var util = require('util')
  , spawn = require('child_process').spawn
  , Duplex = require('stream').Duplex

// inherit environment variables
function Env(envProps) {
  Object.keys(envProps).forEach(function (key) {
    this[key] = envProps[key]
  }, this)
}

Env.prototype = process.env

function SimpleChild(cmd, options) {
  var o

  if (!(this instanceof SimpleChild))
    return new SimpleChild(cmd)

  Duplex.call(this)

  o = cmd.split(' ')
  if (!o.length) return

  this._cmd = o.shift()
  this._args = o

  if (!this._options) {
    this._options = 'object' === typeof options
      ? options : {}
  }

  this._silent = !!this._options.silent || false

  if (this._options.env && !this._options.inherit)
    this._options.env = new Env(this._options.env)

  this._writeBuffer = []
  this._started = false
}

util.inherits(SimpleChild, Duplex)

function alwaysFunc(fn) {
  return 'function' !== typeof fn ? function () {} : fn
}

SimpleChild.prototype.start = function start(cb) {
  this._child = spawn(this._cmd, this._args, this._options)
  this._throttle(this._child.stdin, cb)

  // manually listen for data and push through readable state
  this._child.stderr.on('data', this.push.bind(this))
  this._child.stdout.on('data', this.push.bind(this))

  if (!this._silent) {
    // pipe to stdout
    this._child.stdout.pipe(process.stdout)
    this._child.stderr.pipe(process.stdout)
  }
  this._started = true
  return this
}

SimpleChild.prototype._throttle = function throttle(stream, done) {
  var childProcess = this

  if (this._writeBuffer.length) {
    process.nextTick(function () {
      stream.write(this._writeBuffer.shift())
      childProcess._throttle(stream, childProcess._writeBuffer, done)
    })
  } else {
    process.nextTick(function () {
      alwaysFunc(done).call(childProcess)
    })
  }
}

SimpleChild.prototype._write = function (chunk, enc, next) {
  // write or buffer
  if (this._child && this._child.stdin && this._started) {
    this._child.stdin.write(chunk)
  } else if (this.bufferWrites !== false) {
    this._writeBuffer.push(chunk)
  }
  next()
}

SimpleChild.prototype._read = function () {}

SimpleChild.prototype.stop = function stop(cb) {
  this._started = false
  this._child.on('exit', alwaysFunc(cb).bind(this))

  this._child.stdin.end(null)
  this._child.stdout.removeListener('data', this.push.bind(this))
  this._child.stderr.removeListener('data', this.push.bind(this))

  if (!this._silent) {
    this._child.stdout.unpipe(process.stdout)
    this._child.stderr.unpipe(process.stdout)
  }
  this._child.kill('SIGINT')
  return this
}

SimpleChild.prototype.restart = function restart(cb) {
  return this.stop(function () {
    this.start(cb)
  })
}
