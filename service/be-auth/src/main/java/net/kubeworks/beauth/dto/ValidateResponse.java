package net.kubeworks.beauth.dto;

public record ValidateResponse(boolean valid, Long userId, String username) {}
