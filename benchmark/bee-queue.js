let usage = require('usage')
let debug = require('debug')('bee-queue')

let Queue = require('bee-queue')
let queue = new Queue('test')

let finished = ran = 0
let finishTime, startTime

let concurrency = parseInt(process.env.CONCURRENCY)
let jobs = parseInt(process.env.JOBS)
let runs = parseInt(process.env.RUNS) || 1

;(async () => {
  let results = []

  let makeLog = () => usage.lookup(process.pid, (err, usage) => {
    if (err) debug('err', err)

    let o = {}

    o.concurrency = concurrency
    o.jobs = jobs
    o.runs = runs
    o.duration = results.reduce((sum, val) => sum += val, 0) + ' ms'
    o.times = results.map(v => v + ' ms')
    o.avg = results.reduce((sum, val) => sum += val, 0) / runs + ' ms'
    o.usage = usage

    debug('~~ bee-queue benchmark ~~')
    debug(JSON.stringify(o, null, 4))
  })
  var addSomejobs = function () {
    for (var i = 0; i < jobs; i++) {
      queue.createJob({i: i}).save()
    }
  }

  var reportResult = function (result) {
    finished += 1

    debug(finished, '/', jobs)

    if (finished === jobs) {
      finishTime = (new Date()).getTime()

      results.push(finishTime - startTime)

      if (++ran < runs) addSomejobs()
      else makeLog()

      finished = 0
      startTime = (new Date()).getTime()
    }
  }

  queue.process(concurrency, function (job, done) {
    reportResult()
    return done()
  })

  startTime = (new Date()).getTime()
  addSomejobs()
})().catch(debug)
