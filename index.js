let debug = require('debug')('hyperqueue')

let Queue = require('./lib/Queue')
let Redis = require('ioredis')
let queue = new Queue('test', new Redis())

;(async () => {
  await queue.process(async function (job) {
    debug('Processing job', job)
  })

  queue.add({ foo: 1 })
})().catch(debug)
