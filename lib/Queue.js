const debug = require('debug')('queue')
const uuid = require('uuid/v4')
const fs = require('fs')
const util = require('util')

class Queue {
  constructor (name, redis, prefix = 'hyperqueue') {
    if (typeof name !== 'string') {
      throw new Error('Must provide string for name')
    }

    if (typeof prefix !== 'string') {
      throw new Error('Must provide string for prefix')
    }

    this.name = name
    this.redis = redis

    this.keys = {
      jobHash: `${prefix}.${name}.jobs`,
      activeList: `${prefix}.${name}.active`,
      waitingList: `${prefix}.${name}.waiting`,
      stalledList: `${prefix}.${name}.stalled`,
      delayedList: `${prefix}.${name}.delayed`,
      ...this.makeChannelKeys(name, prefix)
    }

    // debug('this.keys', this.keys)

    this.loadScripts()
  }

  loadScripts () {
    const readFile = util.promisify(fs.readFile)
    const scripts = [{
      name: 'addJob',
      src: './lib/lua/addJob.lua'
    }, {
      name: 'completeJob',
      src: './lib/lua/completeJob.lua'
    }]

    scripts.forEach(async script => {
      const lua = await readFile(script.src)

      this.redis.defineCommand(script.name, {
        lua
      })
    })
  }

  makeChannelKeys (name, prefix) {
    const baseChannel = `${prefix}.${name}.events`
    const kinds = [
      'added',
      'completed',
      'failed'
    ]

    const toKey = kind => `${kind}Channel`
    const toVal = kind => `${baseChannel}.${kind}`

    return kinds.reduce((obj, kind) => (obj[toKey(kind)] = toVal(kind)) && obj, {})
  }

  async process (handler) {
    let sub = this.redis.duplicate()
    let subChannel = this.keys.addedChannel
    // debug('subChannel', subChannel)

    await sub.subscribe(subChannel)

    sub.on('message', async (msgChannel) => {
      // debug('Got message')

      //TODO GET JOB VIA REDIS SCRIPT! 

      let id = await this.redis.rpoplpush(this.keys.waitingList, this.keys.activeList)
      // debug('id', id)

      let job = await this.redis.hget(this.keys.jobHash, id)
      // debug('job', job)

      handler(job)
        .then(() => {
          this.complete(id)
        })
    })
  }

  complete (id) {
    debug('-> complete', id)

    const keys = [
      this.keys.jobHash,
      this.keys.activeList,
      this.keys.completedChannel
    ]

    // debug('keys', keys)

    this.redis.completeJob(keys.length, ...keys, id)
  }

  add (data) {
    debug('-> add')

    const id = uuid()

    const keys = [
      this.keys.jobHash,
      this.keys.waitingList,
      this.keys.addedChannel
    ]

    // debug('keys', keys)

    const values = [
      id,
      JSON.stringify(data)
    ]

    this.redis.addJob(keys.length, ...keys, ...values)
    // debug('added', added)
  }
}

module.exports = Queue
