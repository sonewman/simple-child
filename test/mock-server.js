
var http = require('http')
  , server = http.createServer()

server.on('request', function (req, res) {
  res.writeHead(200)
  res.end('ok')
})

server.listen(process.env.PORT, function () {
  console.log('ready')
})

process.stdin.on('readable', function () {
  var msg = this.read().toString('utf8').trim()
  if ('test' === msg) process.stdout.write('recieved')
})

