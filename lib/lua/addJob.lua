local jobsHash = KEYS[1]
local waitingList = KEYS[2]
local addedChannel = KEYS[3]

local id = ARGV[1]
local data = ARGV[2]

redis.call('hset', jobsHash, id, data)
redis.call('lpush', waitingList, id)
redis.call('publish', addedChannel, id)

return id
