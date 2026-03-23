package net.kubeworks.beauth.controller;

import io.jsonwebtoken.Claims;
import net.kubeworks.beauth.dto.LoginRequest;
import net.kubeworks.beauth.dto.LoginResponse;
import net.kubeworks.beauth.dto.ValidateResponse;
import net.kubeworks.beauth.service.AuthService;
import net.kubeworks.beauth.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    public AuthController(AuthService authService, JwtUtil jwtUtil) {
        this.authService = authService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        log.info("action=login username={}", request.username());
        try {
            LoginResponse response = authService.login(request.username(), request.password());
            log.info("action=login username={} userId={} status=success", request.username(), response.userId());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("action=login username={} status=failed reason=\"{}\"", request.username(), e.getMessage());
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String username = extractUsername(authHeader);
        log.info("action=logout username={}", username);
        return ResponseEntity.ok(Map.of("message", "로그아웃 되었습니다."));
    }

    @GetMapping("/validate")
    public ResponseEntity<?> validate(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("action=validate status=failed reason=missing_token");
            return ResponseEntity.status(401).body(new ValidateResponse(false, null, null));
        }
        try {
            String token = authHeader.substring(7);
            Claims claims = jwtUtil.validateToken(token);
            Long userId = claims.get("userId", Long.class);
            String username = claims.getSubject();
            log.info("action=validate username={} userId={} status=success", username, userId);
            return ResponseEntity.ok(new ValidateResponse(true, userId, username));
        } catch (Exception e) {
            log.warn("action=validate status=failed reason=\"{}\"", e.getMessage());
            return ResponseEntity.status(401).body(new ValidateResponse(false, null, null));
        }
    }

    private String extractUsername(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return "unknown";
        try {
            return jwtUtil.validateToken(authHeader.substring(7)).getSubject();
        } catch (Exception e) {
            return "unknown";
        }
    }
}