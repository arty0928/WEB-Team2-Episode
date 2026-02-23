package com.yat2.episode.auth.refresh;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < CURRENT_TIMESTAMP")
    int deleteExpired();

    void deleteByTokenHash(String tokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            """
                        UPDATE RefreshToken RT
                           SET RT.tokenHash = :newHash,
                               RT.expiresAt = :expiresAt
                         WHERE RT.user.kakaoId = :userId
                           AND RT.tokenHash = :beforeHash
                    """
    )
    int rotateIfMatch(
            @Param("userId") Long userId,
            @Param("beforeHash") String beforeHash,
            @Param("newHash") String newHash,
            @Param("expiresAt") LocalDateTime expiresAt
    );
}

