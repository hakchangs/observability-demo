package net.kubeworks.beauth.dto;

public record LoginResponse(String token, Long userId, String username) {}
