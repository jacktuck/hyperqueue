const debug = require('debug')('queue')
const uuid = require('uuid/v4')

const hyperid = require('hyperid')()

const flat = require('flat')
// const Job = require('./Job')

class Queue {
  constructor (name, redis, opts) {
    this.name = name
    this.redis = redis
    this.opts = Object.assign({}, opts, {
      prefix: 'meeseek'
    })

    let prepend = `${this.opts.prefix}:${this.name}`

    this.prepend = prepend
  }

  getJobKey (id) {
    return `${this.prepend}:job:${id}`
  }

  getPubSubKey (type) {
    return `${this.prepend}:pubsub:${type}`
  }

  getListKey (type) {
    return `${this.prepend}:list:${type}`
  }

  async process (handler) {
    let sub = this.redis.duplicate()
    let channel = this.getPubSubKey('waiting')

    await sub.subscribe(channel)

    sub.on('message', async (msgChannel) => {
      if (channel !== msgChannel) return

      let jobId = await this.redis.rpoplpush(this.getListKey('waiting'), this.getListKey('active'))
      // debug('jobId', jobId)

      let job = await this.redis.hgetall(this.getJobKey(jobId))

      // debug('job', job)

      handler(job)
        .then(async () => {
          // debug('removing key')

          let removed = await this.redis.multi()
            .lrem(this.getListKey('active'), -1, jobId)
            .del(this.getJobKey(jobId))
            .exec()

          // debug('removed', removed)
        })
        .catch(() => {
          this.redis.rpoplpush(this.getListKey('active'), this.getListKey('failed'))
        })
    })
  }

  add (data) {
    const id = hyperid()

    this.redis.multi()
      .hmset(this.getJobKey(id), {
        id,
        data: JSON.stringify(data)
        // ...flat(data)
      })
      .rpush(this.getListKey('waiting'), id)
      .publish(this.getPubSubKey('waiting'), id)
      .exec()
  }
}

module.exports = Queue
