package net.kubeworks.beproduct.filter;

import io.opentelemetry.api.baggage.Baggage;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;

@Component
@Order(1)
public class GuidFilter extends OncePerRequestFilter {

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String guid = Baggage.current().getEntryValue("guid");

        try {
            if (guid == null || guid.isBlank()) {
                guid = generateGuid();
                Baggage newBaggage = Baggage.current().toBuilder().put("guid", guid).build();
                try (Scope scope = newBaggage.storeInContext(Context.current()).makeCurrent()) {
                    setSpanAttributes(guid);
                    chain.doFilter(request, response);
                }
            } else {
                setSpanAttributes(guid);
                chain.doFilter(request, response);
            }
        } finally {
            MDC.remove("guid");
            MDC.remove("session.id");
            MDC.remove("user.id");
        }
    }

    private void setSpanAttributes(String guid) {
        Span span = Span.current();
        span.setAttribute("guid", guid);
        MDC.put("guid", guid);
        String sessionId = Baggage.current().getEntryValue("session.id");
        String userId = Baggage.current().getEntryValue("user.id");
        if (sessionId != null && !sessionId.isBlank()) {
            span.setAttribute("session.id", sessionId);
            MDC.put("session.id", sessionId);
        }
        if (userId != null && !userId.isBlank()) {
            span.setAttribute("user.id", userId);
            MDC.put("user.id", userId);
        }
    }

    private String generateGuid() {
        String timestamp = LocalDateTime.now().format(FORMATTER);
        long random = ThreadLocalRandom.current().nextLong(0, 10_000_000_000L);
        return timestamp + "LTP" + String.format("%010d", random);
    }
}