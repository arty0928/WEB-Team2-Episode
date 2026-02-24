local t = redis.call('TYPE', KEYS[1])['ok']
if t ~= 'stream' then
  return 0
end
local len = redis.call('XLEN', KEYS[1])
if len == 0 then
  return redis.call('DEL', KEYS[1])
end
return 0
