const moment = require('moment')
const express = require('express')
const Primus = require('primus')
const http = require('http')
const MongoDb = require('./persistence')

module.exports = class Server {
  constructor (opts) {
    this.app = express()
    this.app.get('/', this.serve.bind(this))
    this.port = process.env.WS_PORT || 3000
    this.server = http.createServer(this.app)
    this.primus = new Primus(this.server, { transformer: 'websockets' })
    this.db = new MongoDb()

    return this
  }

  serve (req, res) {
    this.db
      .lastN()
      .then(r => res.json(r))
      .catch(e => res.status(500).json(e))
  }

  run () {
    this.primus.on('connection', (spark) => {
      spark.on('data', (data) => {
        if (data && data.action && data.action === 'tick') {
          this.db.persistOne(data.data)
        }
      })
    })
    this.primus.on('disconnection', (spark) => {
      console.log('client disconnected')
    })

    this.server.listen(this.port, () => {
      console.log(`server is listening on port ${this.port}`)
    })

    return this
  }
}