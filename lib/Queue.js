const { EventEmitter } = require('events')
const debug = require('debug')('queue')
const uuid = require('uuid/v4')
const fs = require('fs')
const Redis = require('ioredis')

class Queue extends EventEmitter {
  constructor (name, redis, prefix = 'hyperqueue') {
    super()

    if (typeof name !== 'string') {
      throw new Error('Must provide string for name')
    }

    if (typeof prefix !== 'string') {
      throw new Error('Must provide string for prefix')
    }

    this.name = name

    this.keys = {
      jobHash: `${prefix}.${name}.jobs`,
      activeList: `${prefix}.${name}.active`,
      waitingList: `${prefix}.${name}.waiting`,
      stalledList: `${prefix}.${name}.stalled`,
      delayedList: `${prefix}.${name}.delayed`,
      ...this.makeChannelKeys(name, prefix)
    }
  }

  redis (options) {
    this.redisClient = new Redis(options)
    this.loadScripts()

    return this
  }

  redisCluster (options) {
    this.redisClient = new Redis.Cluser(options)
    this.loadScripts()

    return this
  }

  loadScripts () {
    const scripts = [{
      name: 'addJob',
      src: './lib/lua/addJob.lua'
    }, {
      name: 'completeJob',
      src: './lib/lua/completeJob.lua'
    }, , {
      name: 'popJob',
      src: './lib/lua/popJob.lua'
    }]

    scripts.forEach(script => {
      const lua = fs.readFileSync(script.src)

      this.redisClient.defineCommand(script.name, {
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
    let sub = this.redisClient.duplicate()
    let subChannel = this.keys.addedChannel

    sub.on('connect', () => debug('connect'))
    sub.on('ready', () => debug('ready'))
    sub.on('error', () => debug('error'))
    sub.on('close', () => debug('close'))

    sub.subscribe(subChannel)
    // this.emit('ready')

    sub.on('message', async () => {
      const keys = [
        this.keys.jobHash,
        this.keys.waitingList,
        this.keys.activeList
      ]

      let [id, job] = await this.redisClient.popJob(keys.length, ...keys)
      if (!id || !job) return

      try {
        await handler(job)
        await this.complete(id)
      } catch (e) { debug(e) }
    })
  }

  async complete (id) {
    const keys = [
      this.keys.jobHash,
      this.keys.activeList,
      this.keys.completedChannel
    ]

    await this.redisClient.completeJob(keys.length, ...keys, id)
    // debug('completed', id)
  }

  async add (data) {
    // debug('-> add')

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

    await this.redisClient.addJob(keys.length, ...keys, ...values)
  }
}

module.exports = Queue
