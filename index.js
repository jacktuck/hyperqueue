const debug = require('debug')('runner')
// var Queue = require('bee-queue')
// var queue = new Queue('test')
//
//   var finished = 0
//   var finishTime, startTime
//
//   var reportResult = function (result) {
//     finished += 1
//     if (finished === 1e4) {
//       finishTime = (new Date()).getTime()
//       debug('FINISHED IN', finishTime - startTime)
//     }
//   }
//
//   setTimeout(() => {
//     for (var i = 0; i < 1e4; i++) {
//       debug('adding')
//       queue.createJob({i: i}).save()
//     }
//   }, 1000)
//
//
//
//   queue.process(5, function (job, done) {
//     if (!startTime) startTime = (new Date()).getTime()
//
//     reportResult()
//
//     return done()
//   })



const Queue = require('./lib/Queue').Queue
const Redis = require('ioredis')

var queue = new Queue('test', new Redis())

var finished = 0
var finishTime, startTime

var reportResult = function (result) {
  debug('finished', finished)
  finished += 1
  if (finished === 1e4) {
    finishTime = (new Date()).getTime()
    debug('FINISHED IN', finishTime - startTime)
  }
}

queue.process(async function (job) {
  if (!startTime) startTime = (new Date()).getTime()

  reportResult()
})

setTimeout(() => {
  for (var i = 0; i < 1e4; i++) {
    queue.add({i: i})
  }
}, 1000)
