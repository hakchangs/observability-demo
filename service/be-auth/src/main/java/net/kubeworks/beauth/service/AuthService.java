package net.kubeworks.beauth.service;

import net.kubeworks.beauth.dto.LoginResponse;
import net.kubeworks.beauth.util.JwtUtil;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {

    // 데모용 인메모리 사용자 (userId, username, password)
    private static final Map<String, long[]> USERS = Map.of(
            "user1", new long[]{1L, hashCode("pass1234")},
            "user2", new long[]{2L, hashCode("pass1234")},
            "admin", new long[]{3L, hashCode("admin1234")}
    );

    private final JwtUtil jwtUtil;

    public AuthService(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    public LoginResponse login(String username, String password) {
        long[] userInfo = USERS.get(username);
        if (userInfo == null || userInfo[1] != hashCode(password)) {
            throw new IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다.");
        }
        Long userId = userInfo[0];
        String token = jwtUtil.generateToken(userId, username);
        return new LoginResponse(token, userId, username);
    }

    private static long hashCode(String value) {
        long h = 1125899906842597L;
        for (char c : value.toCharArray()) {
            h = 31 * h + c;
        }
        return h;
    }
}
