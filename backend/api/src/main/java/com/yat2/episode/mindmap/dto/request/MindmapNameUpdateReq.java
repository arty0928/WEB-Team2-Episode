package com.yat2.episode.mindmap.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MindmapNameUpdateReq(
        @NotBlank(message = "이름은 공백일 수 없습니다.") @Size(max = 20, message = "이름은 20자 이내여야 합니다.") String name
) {}
