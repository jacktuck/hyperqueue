let usage = require('usage')
let debug = require('debug')('meeseek')

let Queue = require('../lib/Queue')
let Redis = require('ioredis')
let queue = new Queue('test', new Redis())

let finished = ran = 0
let finishTime, startTime

let jobs = parseInt(process.env.JOBS)
let runs = parseInt(process.env.RUNS) || 1

;(async () => {
  let results = []

  setInterval(function () {
    console.log(process._getActiveHandles().length)
  }, 1000)

  let makeLog = () => usage.lookup(process.pid, (err, usage) => {
    if (err) debug('err', err)

    let o = {}

    o.jobs = jobs
    o.runs = runs
    o.duration = results.reduce((sum, val) => sum += val, 0) + ' ms'
    o.times = results.map(v => v + ' ms')
    o.avg = results.reduce((sum, val) => sum += val, 0) / runs + ' ms'
    o.usage = usage

    debug('~~ hyperqueue benchmark ~~')
    debug(JSON.stringify(o, null, 4))
  })

  var addSomejobs = function () {
    for (var i = 0; i < jobs; i++) {
      queue.add({i: i})
    }
  }

  var reportResult = function (result) {
    finished += 1

    // debug(finished, '/', jobs)

    if (finished === jobs) {
      finishTime = (new Date()).getTime()

      results.push(finishTime - startTime)

      if (++ran < runs) addSomejobs()
      else makeLog()

      finished = 0
      startTime = (new Date()).getTime()
    }
  }

  await queue.process(async function (job, done) {
    reportResult()
  })

  startTime = (new Date()).getTime()
  addSomejobs()
})().catch(debug)
