package net.kubeworks.beproduct.filter;

import io.opentelemetry.api.baggage.Baggage;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;

@Component
public class OTELInstrumentationFilter extends OncePerRequestFilter {

    private final Logger logger = LoggerFactory.getLogger(OTELInstrumentationFilter.class);

    private static final DateTimeFormatter dateTimeFormatter =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");
    private static final String GUID = "guid";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        logger.debug("OTELInstrumentationFilter start...");

        // 1. 전파된 GUID 획득 및 필요시 신규 생성
        String guid = Baggage.current().getEntryValue(GUID);
        if (guid == null || guid.isBlank()) {
            guid = generateGuid();
        }

        // 2. GUID 전파
        Baggage baggage = Baggage.current().toBuilder().put(GUID, guid).build();
        try (Scope ignored = baggage.storeInContext(Context.current()).makeCurrent()) {

            // 3. Span 에 GUID 저장
            setAttribute(GUID, guid);
            chain.doFilter(request, response);

        } finally {
            removeAttribute(GUID);
        }

        logger.debug("OTELInstrumentationFilter end...");

    }

    private String generateGuid() {
        String timestamp = LocalDateTime.now().format(dateTimeFormatter);
        long random = ThreadLocalRandom.current().nextLong(0, 10_000_000_000L);
        String systemCode = "LTP";
        return timestamp + systemCode + String.format("%010d", random);
    }

    private void setAttribute(String key, String value) {
        Span span = Span.current();
        span.setAttribute(key, value);
        MDC.put(key, value);
    }

    private void removeAttribute(String key) {
        MDC.remove(key);
    }
}
