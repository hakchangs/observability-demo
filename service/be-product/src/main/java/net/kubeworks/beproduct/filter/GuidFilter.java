package net.kubeworks.beproduct.filter;

import io.opentelemetry.api.baggage.Baggage;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;

@Component
public class GuidFilter extends OncePerRequestFilter {

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String guid = Baggage.current().getEntryValue("guid");

        if (guid == null || guid.isBlank()) {
            guid = generateGuid();
            Baggage newBaggage = Baggage.current().toBuilder().put("guid", guid).build();
            try (Scope scope = newBaggage.storeInContext(Context.current()).makeCurrent()) {
                Span.current().setAttribute("guid", guid);
                chain.doFilter(request, response);
            }
        } else {
            Span.current().setAttribute("guid", guid);
            chain.doFilter(request, response);
        }
    }

    private String generateGuid() {
        String timestamp = LocalDateTime.now().format(FORMATTER);
        long random = ThreadLocalRandom.current().nextLong(0, 10_000_000_000L);
        return timestamp + "LTP" + String.format("%010d", random);
    }
}