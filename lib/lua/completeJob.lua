local jobsHash = KEYS[1]
local activeList = KEYS[2]
local completedChannel = KEYS[3]

local id = ARGV[1]

redis.call('hdel', jobsHash, id)
redis.call('lrem', activeList, -1, id)
redis.call('publish', completedChannel, id)

return id
