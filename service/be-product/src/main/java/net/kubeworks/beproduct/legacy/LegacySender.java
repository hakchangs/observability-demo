package net.kubeworks.beproduct.legacy;

import io.opentelemetry.api.baggage.Baggage;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LegacySender {

    private static final Logger log = LoggerFactory.getLogger(LegacySender.class);

    @WithSpan
    public void send(String message) {

        String guid = Baggage.current().getEntryValue("guid");
        log.info("current guid: {}", guid);

        // GUID 이용하여 기간계 메시지 전송
        log.info("send message with guid: {} with {}", message, guid);

    }
}
