package com.yat2.episode.auth;

import com.nimbusds.jwt.JWTClaimsSet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.yat2.episode.auth.jwt.AuthJwtProvider;
import com.yat2.episode.auth.jwt.AuthTokens;
import com.yat2.episode.auth.oauth.KakaoIdTokenVerifier;
import com.yat2.episode.auth.oauth.KakaoOAuthClient;
import com.yat2.episode.auth.oauth.KakaoTokenResponse;
import com.yat2.episode.auth.refresh.RefreshTokenService;
import com.yat2.episode.global.exception.CustomException;
import com.yat2.episode.global.exception.ErrorCode;
import com.yat2.episode.user.User;
import com.yat2.episode.user.UserService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService 테스트")
class AuthServiceTest {

    @Mock
    private KakaoOAuthClient kakaoOAuthClient;

    @Mock
    private KakaoIdTokenVerifier kakaoIdTokenVerifier;

    @Mock
    private AuthJwtProvider authJwtProvider;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private UserService userService;

    @InjectMocks
    private AuthService authService;

    private String code;

    @BeforeEach
    void setUp() {
        code = "kakao-auth-code";
    }

    @Nested
    @DisplayName("handleKakaoCallback")
    class KakaoCallbackTests {

        @Test
        @DisplayName("성공: 카카오 로그인 콜백 처리 후 토큰 발급 + refresh 저장")
        void handleKakaoCallback_Success() {
            KakaoTokenResponse kakaoResponse = mock(KakaoTokenResponse.class);
            when(kakaoOAuthClient.requestToken(code)).thenReturn(kakaoResponse);
            when(kakaoResponse.idToken()).thenReturn("kakao-id-token");

            JWTClaimsSet claims = mock(JWTClaimsSet.class);
            when(kakaoIdTokenVerifier.verify("kakao-id-token")).thenReturn(claims);

            long kakaoUserId = 777L;
            when(claims.getSubject()).thenReturn(String.valueOf(kakaoUserId));
            when(claims.getClaim("nickname")).thenReturn("NEW_NICK");

            User user = mock(User.class);
            when(userService.getOrCreateKakaoUser(kakaoUserId, "NEW_NICK")).thenReturn(user);
            when(user.getNickname()).thenReturn("NEW_NICK");

            AuthTokens tokens = new AuthTokens("access-aaa", "refresh-bbb");
            when(authJwtProvider.issueTokens(kakaoUserId)).thenReturn(tokens);

            AuthTokens result = authService.handleKakaoCallback(code);

            assertThat(result.accessToken()).isEqualTo("access-aaa");
            assertThat(result.refreshToken()).isEqualTo("refresh-bbb");

            verify(refreshTokenService, times(1)).save(kakaoUserId, "refresh-bbb");
            verify(user, never()).changeNickname(anyString());
        }

        @Test
        @DisplayName("성공: 기존 유저 닉네임과 claim 닉네임이 다르면 닉네임 갱신")
        void handleKakaoCallback_ChangesNickname_WhenDifferent() {
            KakaoTokenResponse kakaoResponse = mock(KakaoTokenResponse.class);
            when(kakaoOAuthClient.requestToken(code)).thenReturn(kakaoResponse);
            when(kakaoResponse.idToken()).thenReturn("kakao-id-token");

            JWTClaimsSet claims = mock(JWTClaimsSet.class);
            when(kakaoIdTokenVerifier.verify("kakao-id-token")).thenReturn(claims);

            long kakaoUserId = 777L;
            when(claims.getSubject()).thenReturn(String.valueOf(kakaoUserId));
            when(claims.getClaim("nickname")).thenReturn("NEW_NICK");

            User user = mock(User.class);
            when(userService.getOrCreateKakaoUser(kakaoUserId, "NEW_NICK")).thenReturn(user);
            when(user.getNickname()).thenReturn("OLD_NICK");

            AuthTokens tokens = new AuthTokens("access-aaa", "refresh-bbb");
            when(authJwtProvider.issueTokens(kakaoUserId)).thenReturn(tokens);

            authService.handleKakaoCallback(code);

            verify(user, times(1)).changeNickname("NEW_NICK");
            verify(refreshTokenService, times(1)).save(kakaoUserId, "refresh-bbb");
        }

        @Test
        @DisplayName("성공: claim에 nickname이 없으면 USER_{id}로 기본 닉네임 사용")
        void handleKakaoCallback_DefaultNickname_WhenClaimMissing() {
            KakaoTokenResponse kakaoResponse = mock(KakaoTokenResponse.class);
            when(kakaoOAuthClient.requestToken(code)).thenReturn(kakaoResponse);
            when(kakaoResponse.idToken()).thenReturn("kakao-id-token");

            JWTClaimsSet claims = mock(JWTClaimsSet.class);
            when(kakaoIdTokenVerifier.verify("kakao-id-token")).thenReturn(claims);

            long kakaoUserId = 777L;
            when(claims.getSubject()).thenReturn(String.valueOf(kakaoUserId));
            when(claims.getClaim("nickname")).thenReturn(null);

            String expectedNickname = "USER_" + kakaoUserId;
            User user = mock(User.class);
            when(userService.getOrCreateKakaoUser(kakaoUserId, expectedNickname)).thenReturn(user);
            when(user.getNickname()).thenReturn(expectedNickname);

            AuthTokens tokens = new AuthTokens("access-aaa", "refresh-bbb");
            when(authJwtProvider.issueTokens(kakaoUserId)).thenReturn(tokens);

            authService.handleKakaoCallback(code);

            verify(userService, times(1)).getOrCreateKakaoUser(kakaoUserId, expectedNickname);
            verify(refreshTokenService, times(1)).save(kakaoUserId, "refresh-bbb");
        }

        @Test
        @DisplayName("실패: subject가 숫자가 아니면 NumberFormatException이 발생(현재 구현 기준)")
        void handleKakaoCallback_Fail_WhenSubjectInvalid() {
            KakaoTokenResponse kakaoResponse = mock(KakaoTokenResponse.class);
            when(kakaoOAuthClient.requestToken(code)).thenReturn(kakaoResponse);
            when(kakaoResponse.idToken()).thenReturn("kakao-id-token");

            JWTClaimsSet claims = mock(JWTClaimsSet.class);
            when(kakaoIdTokenVerifier.verify("kakao-id-token")).thenReturn(claims);
            when(claims.getSubject()).thenReturn("not-a-number");

            assertThatThrownBy(() -> authService.handleKakaoCallback(code)).isInstanceOf(NumberFormatException.class);
        }
    }

    @Nested
    @DisplayName("refresh")
    class RefreshTests {

        @Test
        @DisplayName("성공: refresh 토큰 검증 후 새 토큰 발급하고 refresh rotate 수행")
        void refresh_Success() {
            String beforeRefresh = "before-rt";
            long userId = 99L;

            when(authJwtProvider.verifyRefreshTokenAndGetUserId(beforeRefresh)).thenReturn(userId);

            AuthTokens issued = new AuthTokens("new-at", "new-rt");
            when(authJwtProvider.issueTokens(userId)).thenReturn(issued);

            AuthTokens result = authService.refresh(beforeRefresh);

            assertThat(result.accessToken()).isEqualTo("new-at");
            assertThat(result.refreshToken()).isEqualTo("new-rt");

            verify(refreshTokenService, times(1)).rotateOrThrow(userId, "new-rt", beforeRefresh);
        }

        @Test
        @DisplayName("실패: rotateOrThrow가 INVALID_TOKEN을 던지면 그대로 전파")
        void refresh_Fail_WhenRotateInvalid() {
            String beforeRefresh = "before-rt";
            long userId = 99L;

            when(authJwtProvider.verifyRefreshTokenAndGetUserId(beforeRefresh)).thenReturn(userId);

            AuthTokens issued = new AuthTokens("new-at", "new-rt");
            when(authJwtProvider.issueTokens(userId)).thenReturn(issued);

            doThrow(new CustomException(ErrorCode.INVALID_TOKEN)).when(refreshTokenService)
                    .rotateOrThrow(userId, "new-rt", beforeRefresh);

            assertThatThrownBy(() -> authService.refresh(beforeRefresh)).isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_TOKEN);
        }
    }
}
