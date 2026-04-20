### GUID 전파

작업내용
- GUID 생성/수신하고 전파 처리
- Traces, Logs 에 GUID 저장

> 적용 Stack: spring-boot 4.x + spring-mvc + logback 

#### Filter 추가 예제

##### 1. 라이브러리 추가
```xml
<!-- OTEL Custom 을 위한 기본 LIB -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-api</artifactId>
    <version>1.60.1</version>
</dependency>
```

##### 2. GUID 추가: Custom Filter 에서 추가
```java
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
```

##### 3. Sample Controller 추가
```java
@RestController
@RequestMapping("/test")
public class TestController {

    private static final Logger log = LoggerFactory.getLogger(TestController.class);

    @GetMapping("/service")
    public String service() {
        log.info("this is service");
        return "this is service..";
    }
}
```

##### 4. 확인
1. HTTP 요청 호출: `curl localhost:8080/test/service`
2. (Grafana) Traces > 요청한 Trace 선택 > Span Attributes > guid 확인 > 정상
3. (Grafana) Logs > 요청한 Log 선택 > Structured Metadata > guid 확인 > 정상



#### 기간계 전송

##### 1. 라이브러리 추가
```xml
<!-- OTEL Custom 을 위한 기본 LIB -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-api</artifactId>
    <version>1.60.1</version>
</dependency>
```

##### 2. 기간계 Sender 작성
```java
@Component
public class LegacySender {

    private static final Logger log = LoggerFactory.getLogger(LegacySender.class);

    // Span 분리
    @WithSpan
    public void send(String message) {

        String guid = Baggage.current().getEntryValue("guid");
        log.info("current guid: {}", guid);

        // GUID 이용하여 기간계 메시지 전송
        log.info("send message with guid: {} with {}", message, guid);

    }
}
```

##### 3. 테스트 코드 작성
```java
@RestController
@RequestMapping("/test")
public class TestController {

    private static final Logger log = LoggerFactory.getLogger(TestController.class);
    private final LegacySender legacySender;

    public TestController(LegacySender legacySender) {
        this.legacySender = legacySender;
    }
    
    @PostMapping("/legacy/send")
    public Map<String, Object> legacySend(@RequestBody String message) {
        log.info("print legacy send...");
        legacySender.send(message);
        return Map.of("message", "ok");
    }
}
```

##### 4. 확인
1. curl -X POST localhost:8080/test/legacy/send -H 'Content-Type: plain/text" -d "test msg"
2. (Grafana) Traces > 해당 추적 검색 > Span 분리여부 확인 > 정상
3. (Grafana) Logs > 해당 로그 검색 > `LegacySender` 에서 guid 획득 및 로그 출력여부 확인 > 정상
