package com.yat2.episode.mindmap.dto.request;

import jakarta.validation.constraints.Size;

public record MindmapCreateReq(
        boolean isShared,
        @Size(max = 20, message = "이름은 20자 이내여야 합니다.") String title
) {}
