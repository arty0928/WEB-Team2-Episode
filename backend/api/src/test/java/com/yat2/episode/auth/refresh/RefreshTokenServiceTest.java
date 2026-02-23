package com.yat2.episode.auth.refresh;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Base64;

import com.yat2.episode.auth.jwt.AuthJwtProperties;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.user.User;
import com.yat2.episode.user.UserRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefreshTokenService 테스트")
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private AuthJwtProperties authJwtProperties;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    private long userId;

    @BeforeEach
    void setUp() {
        userId = 123L;
    }

    private static String sha256Base64(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(bytes);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Nested
    @DisplayName("save")
    class SaveTests {

        @Test
        @DisplayName("성공: refresh_token을 해시해서 저장한다")
        void save_Success() {
            String refreshToken = "rt-plain-text";
            User userRef = mock(User.class);
            when(userRepository.getReferenceById(userId)).thenReturn(userRef);

            refreshTokenService.save(userId, refreshToken);

            ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
            verify(refreshTokenRepository, times(1)).save(captor.capture());

            RefreshToken saved = captor.getValue();
            assertThat(saved).isNotNull();
            assertThat(saved.getTokenHash()).isEqualTo(sha256Base64(refreshToken));
            assertThat(saved.getExpiresAt()).isAfter(LocalDateTime.now().minusSeconds(5));
        }
    }

    @Nested
    @DisplayName("rotateOrThrow")
    class RotateTests {

        @Test
        @DisplayName("성공: rotateIfMatch가 1을 반환하면 예외 없이 종료")
        void rotate_Success() {
            String before = "before-token";
            String after = "new-token";

            when(refreshTokenRepository.rotateIfMatch(eq(userId), eq(sha256Base64(before)), eq(sha256Base64(after)),
                                                      any(LocalDateTime.class))).thenReturn(1);

            refreshTokenService.rotateOrThrow(userId, after, before);

            verify(refreshTokenRepository, times(1)).rotateIfMatch(eq(userId), eq(sha256Base64(before)),
                                                                   eq(sha256Base64(after)), any(LocalDateTime.class));
        }

        @Test
        @DisplayName("실패: rotateIfMatch가 0이면 INVALID_TOKEN 예외 발생")
        void rotate_Fail_WhenNotUpdated() {
            String before = "before-token";
            String after = "new-token";

            when(refreshTokenRepository.rotateIfMatch(anyLong(), anyString(), anyString(),
                                                      any(LocalDateTime.class))).thenReturn(0);

            assertThatThrownBy(() -> refreshTokenService.rotateOrThrow(userId, after, before)).isInstanceOf(
                    CustomException.class).hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_TOKEN);
        }
    }

    @Nested
    @DisplayName("deleteByRefreshToken")
    class DeleteTests {

        @Test
        @DisplayName("성공: refreshToken이 유효하면 tokenHash로 삭제 요청")
        void delete_Success() {
            String refreshToken = "rt-plain-text";

            refreshTokenService.deleteByRefreshToken(refreshToken);

            verify(refreshTokenRepository, times(1)).deleteByTokenHash(eq(sha256Base64(refreshToken)));
        }

        @Test
        @DisplayName("성공: refreshToken이 null/blank이면 아무것도 하지 않음")
        void delete_NoOp_WhenNullOrBlank() {
            refreshTokenService.deleteByRefreshToken(null);
            refreshTokenService.deleteByRefreshToken(" ");

            verify(refreshTokenRepository, never()).deleteByTokenHash(anyString());
        }

        @Test
        @DisplayName("성공: 삭제 중 예외가 발생해도 삼키고 로그만 남김")
        void delete_SwallowsException() {
            String refreshToken = "rt-plain-text";
            doThrow(new RuntimeException("db down")).when(refreshTokenRepository).deleteByTokenHash(anyString());

            refreshTokenService.deleteByRefreshToken(refreshToken);

            verify(refreshTokenRepository, times(1)).deleteByTokenHash(eq(sha256Base64(refreshToken)));
        }
    }
}
