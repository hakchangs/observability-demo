package net.kubeworks.beproduct.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@Order(2)
public class HttpLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(HttpLoggingFilter.class);
    private static final int MAX_BODY_SIZE = 10 * 1024;

    private static final Set<String> EXCLUDED_HEADERS = Set.of(
            "authorization", "cookie", "set-cookie"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (!log.isDebugEnabled()) {
            chain.doFilter(request, response);
            return;
        }

        byte[] bodyBytes = readBody(request);
        HttpServletRequest req = new CachedBodyRequestWrapper(request, bodyBytes);
        ContentCachingResponseWrapper res = new ContentCachingResponseWrapper(response);

        logRequest(req, bodyBytes);
        try {
            chain.doFilter(req, res);
        } finally {
            logResponse(req, res);
            res.copyBodyToResponse();
        }
    }

    private byte[] readBody(HttpServletRequest request) throws IOException {
        byte[] bytes = request.getInputStream().readAllBytes();
        return bytes.length > MAX_BODY_SIZE ? Arrays.copyOf(bytes, MAX_BODY_SIZE) : bytes;
    }

    private void logRequest(HttpServletRequest req, byte[] bodyBytes) {
        String headers = Collections.list(req.getHeaderNames()).stream()
                .filter(h -> !EXCLUDED_HEADERS.contains(h.toLowerCase()))
                .map(h -> h + "=" + req.getHeader(h))
                .collect(Collectors.joining(", "));
        String body = new String(bodyBytes,
                req.getCharacterEncoding() != null ? Charset.forName(req.getCharacterEncoding()) : StandardCharsets.UTF_8);

        log.atDebug()
                .addKeyValue("log_type", "http")
                .addKeyValue("http.event", "request")
                .addKeyValue("http.method", req.getMethod())
                .addKeyValue("http.url", req.getRequestURI())
                .addKeyValue("http.request.headers", headers)
                .log("req={}", body);
    }

    private void logResponse(HttpServletRequest req, ContentCachingResponseWrapper res) {
        String body = new String(res.getContentAsByteArray(),
                res.getCharacterEncoding() != null ? Charset.forName(res.getCharacterEncoding()) : StandardCharsets.UTF_8);

        log.atDebug()
                .addKeyValue("log_type", "http")
                .addKeyValue("http.event", "response")
                .addKeyValue("http.method", req.getMethod())
                .addKeyValue("http.url", req.getRequestURI())
                .addKeyValue("http.status", res.getStatus())
                .log("res={}", body);
    }

    private static class CachedBodyRequestWrapper extends HttpServletRequestWrapper {
        private final byte[] body;

        CachedBodyRequestWrapper(HttpServletRequest request, byte[] body) {
            super(request);
            this.body = body;
        }

        @Override
        public ServletInputStream getInputStream() {
            return new CachedBodyServletInputStream(body);
        }

        @Override
        public BufferedReader getReader() {
            return new BufferedReader(new InputStreamReader(new ByteArrayInputStream(body), StandardCharsets.UTF_8));
        }
    }

    private static class CachedBodyServletInputStream extends ServletInputStream {
        private final ByteArrayInputStream inputStream;

        CachedBodyServletInputStream(byte[] body) {
            this.inputStream = new ByteArrayInputStream(body);
        }

        @Override public int read() throws IOException { return inputStream.read(); }
        @Override public boolean isFinished() { return inputStream.available() == 0; }
        @Override public boolean isReady() { return true; }
        @Override public void setReadListener(ReadListener listener) {}
    }
}