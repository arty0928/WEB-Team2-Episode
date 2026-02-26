package com.yat2.episode.collaboration.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "collaboration.ws")
public record WebSocketProperties(
        int sendTimeout,
        Duration heartbeatTimeout,
        int bufferSize,
        int maxMessageSize,
        int roomSessionLimit,
        String pathPrefix,
        List<String> allowedOriginPatterns
) {}
