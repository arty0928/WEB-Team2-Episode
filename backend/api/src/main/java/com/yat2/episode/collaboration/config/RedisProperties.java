package com.yat2.episode.collaboration.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "collaboration.redis")
public record RedisProperties(
        UpdateStream updateStream,
        JobStream jobStream,
        LastEntryIdStore lastEntryIdStore
) {
    public record UpdateStream(
            String keyPrefix,
            Duration ttl,
            String fieldUpdate,
            long snapshotThreshold
    ) {}

    public record JobStream(
            String key,
            Duration inflightTtl,
            Fields fields
    ) {
        public record Fields(
                String type,
                String roomId
        ) {}
    }

    public record LastEntryIdStore(
            String keySuffix
    ) {}
}
