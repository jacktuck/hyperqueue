const debug = require('debug')('runner')
var Queue = require('bee-queue');
var queue = new Queue('test');

  var finished = 0;
  var finishTime, startTime;

  var reportResult = function (result) {
    finished += 1;
    if (finished === 1e4) {
      finishTime = (new Date()).getTime();
      debug('FINISHED IN', finishTime - startTime)
    }
  };

  for (var i = 0; i < 1e4; i++) {
    debug('adding')
    queue.createJob({i: i}).save();
  }

  startTime = (new Date()).getTime();

  queue.process(1, function (job, done) {
    reportResult();
    return done();
  });



// const Queue = require('./lib/Queue').Queue
// const Redis = require('ioredis')
// const debug = require('debug')('runner')
//
// var queue = new Queue('test', new Redis())
//
// var finished = 0
// var finishTime, startTime
//
// var reportResult = function (result) {
//   debug('finished', finished)
//   finished += 1
//   if (finished === 1e4) {
//     finishTime = (new Date()).getTime()
//     debug('FINISHED IN', finishTime - startTime)
//   }
// }
//
// queue.process(async function (job) {
//   reportResult()
// })
//
// startTime = (new Date()).getTime()
//
// setTimeout(() => {
//   for (var i = 0; i < 1e4; i++) {
//     // debug('adding')
//     queue.add({i: i})
//   }
// }, 1000)
