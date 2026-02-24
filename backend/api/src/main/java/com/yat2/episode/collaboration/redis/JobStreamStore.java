package com.yat2.episode.collaboration.redis;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import com.yat2.episode.collaboration.JobType;
import com.yat2.episode.collaboration.config.RedisProperties;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobStreamStore {

    private final StringRedisTemplate stringRedisTemplate;
    private final RedisProperties redisProperties;

    public void publishSnapshot(UUID roomId) {
        publishWithInflight(JobType.SNAPSHOT, roomId);
    }

    public void publishSnapshotForce(UUID roomId) {
        try {
            publish(JobType.SNAPSHOT, roomId);
        } catch (Exception e) {
            log.error("Failed to publish snapshot job. roomId={}", roomId, e);
        }
    }

    public void publishSync(UUID roomId) {
        publishWithInflight(JobType.SYNC, roomId);
    }

    private void publishWithInflight(JobType type, UUID roomId) {
        Duration ttl = redisProperties.jobStream().inflightTtl();
        String lockKey = inflightKey(type, roomId);

        Boolean locked = Boolean.FALSE;
        try {
            locked = stringRedisTemplate.opsForValue().setIfAbsent(lockKey, "1", ttl);
            if (!Boolean.TRUE.equals(locked)) {
                return;
            }

            publish(type, roomId);

        } catch (Exception e) {
            log.error("Failed to publish job with inflight. type={}, roomId={}", type, roomId, e);

            if (Boolean.TRUE.equals(locked)) {
                try {
                    stringRedisTemplate.delete(lockKey);
                } catch (Exception ex) {
                    log.warn("Failed to delete inflight after publish failure. key={}", lockKey, ex);
                }
            }
        }
    }

    private void publish(JobType type, UUID roomId) {
        Map<String, String> fields = new HashMap<>();
        fields.put(redisProperties.jobStream().fields().type(), type.name());
        fields.put(redisProperties.jobStream().fields().roomId(), roomId.toString());

        StreamOperations<String, String, String> ops = stringRedisTemplate.opsForStream();
        MapRecord<String, String, String> record =
                StreamRecords.newRecord().in(redisProperties.jobStream().key()).ofMap(fields);
        ops.add(record);
    }

    private String inflightKey(JobType type, UUID roomId) {
        return redisProperties.updateStream().keyPrefix() + roomId + ":inflight:" + type.name();
    }
}
