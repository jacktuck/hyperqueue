local jobHash = KEYS[1]
local waitingList = KEYS[2]
local activeList = KEYS[3]

local id = redis.call('rpoplpush', waitingList, activeList)

if (id) == 0 then
  return {}
end

local job = redis.call('hget', jobHash, id)
return {id, job}
