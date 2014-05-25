#!/usr/bin/env node
var test = require('tape')
  , http = require('http')
  , path = require('path')
  , Writable = require('stream').Writable
  , SimpleChild = require('../')

test('Create simple child process start and stop', function (t) {
  var PORT = 9873
    , cmd = ['node', path.join(__dirname, './mock-server')].join(' ')
      , child = new SimpleChild(cmd, { env: { PORT: PORT }, silent: true })
      , waitTillStarted = new Writable()

  function stop() {
    child.stop(function () {
      t.end()
    })
  }

  function onreadable() {
    t.equals(this.read().toString().trim(), 'ok')
    stop()
  }

  function testServer() {
    var req = http.request({ port: PORT }, function (res) {
      res.on('readable', onreadable)
    })
    req.end()
  }

  waitTillStarted._write = function (buff, enc, next) {
    if (buff.toString('utf8').trim() === 'ready') {
      testServer()
    }
    next()
  }

  child.start().pipe(waitTillStarted)
})


test('Create simple child process start and restart', function (t) {
  var PORT = 9874
  , cmd = ['node', path.join(__dirname, './mock-server')].join(' ')
  , child = new SimpleChild(cmd, { env: { PORT: PORT } })
  , waitTillStarted = new Writable()

  function restart() {
    child.restart(function () {
      var req = http.request({ port: PORT }, function (res) {
        res.on('readable', onreadable)
      })
      req.on('error', function () {
        // error thrown when connection can't be
        // made because ther child process has been
        // stopped at this point, it is restarted after
        // the readable handle recieves a null msg
        // since the server is not completely closed
        // until then
        t.assert(true)
      })
      req.end()
    })
  }

  function end() {
    t.end()
  }

  var passes = 0
  function onreadable() {
    var result = this.read().toString().trim()
    if (result) {
      t.equals(result, 'ok')

      if (++passes === 1) {
        restart()
      } else {
        child.stop(end)
      }
    } else {
      testServer()
    }
  }

  function testServer() {
    var req = http.request({ port: PORT }, function (res) {
      res.on('readable', onreadable)
    })
    req.end()
  }

  waitTillStarted._write = function (buff, enc, next) {
    if (buff.toString('utf8').trim() === 'ready') {
      testServer()
    }
    next()
  }

  child.start().pipe(waitTillStarted)
})


test('Create a connection to a child process and communicate via stdio', function (t) {
  var PORT = 9875
    , cmd = ['node', path.join(__dirname, './mock-server')].join(' ')
    , child = new SimpleChild(cmd, { env: { PORT: PORT } })
    , waitTillStarted = new Writable()

  function testIo() {
    child.write('test')
  }

  var passes = 0
  waitTillStarted._write = function (buff, enc, next) {
    var msg = buff.toString('utf8').trim()
    if (++passes === 1) {
      t.equals(msg, 'ready')
      testIo()
    } else if (passes === 2) {
      t.equals(msg, 'recieved')
      child.stop(function () {
        t.end()
      })
    }
    next()
  }

  child.start().pipe(waitTillStarted)

})
