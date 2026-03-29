

## Tracing

### Browser 추적 가능범위 (React 기준)
1. Document Load: 페이지 로딩 시점 (리로딩 없는경우 1회만 호출)
   - DocumentLoadInstrumentation 설정시 자동 수집
2. Routing(Navigation): React Route 로 SPA 방식의 리렌더링을 통한 페이지 이동
   - Custom 개발 필요: Routing 로직에 추적로직 추가 (공토처리 가능)
3. Fetch: API 호출시점에 fetch 호출시점 추적
   - FetchInstrumentation 설정시 자동 수집
4. 사용자 액션: Button 클릭 등 이벤트 기반 사용자 행위 추적
   - UserInteractionInstrumentation 설정시 자동 수집
   - event 를 button 으로 한정해도 노이즈가 심함

### Routing - 백엔드 추적 연계 (>>page.id)
- fetch 를 제외한 모든 추적이 백엔드와 연결되지 않음 (DocumentLoad, Routing, 액션 모두 미지원)
- React 기술적 문제로 직접 연결은 어려우나 Span attribute 속성을 추가하여 검색을 통한 확인은 가능함 
  - correlation ID 를 별도로 생성하고 span attribute 에 저장하여 검색 지원
  - page.id 라는 유일 식별자를 만들고 span attribute 설정 
  - Routing 과 fetch 시점에 page.id 설정하면 검색시 연결하여 확인할 수 있음 
  - Custom 코드는 필요하지만 공통처리 영역에서 문제해소 가능 

```markdown
  OTel 기대: 동기적 call stack으로 parent-child 연결
  React 현실: 이벤트 → scheduler → fiber rendering → useEffect → fetch         
              (각 단계가 다른 async context에서 실행)                          
                                                                               
  업계에서 사용하는 패턴들:                                                    
                                                                               
  ┌──────────────────┬───────────────────────────┬────────────────────────┐    
  │       패턴       │           설명            │      적합한 경우       │ 
  ├──────────────────┼───────────────────────────┼────────────────────────┤ 
  │ correlation ID   │ page.id/session.id 같은   │ React SPA, 간단하고    │ 
  │ (현재 방식)      │ attribute로 연관          │ 안정적                 │ 
  ├──────────────────┼───────────────────────────┼────────────────────────┤    
  │ manual context   │ context.with()로 명시적   │ 팀이 OTel에 익숙할 때  │ 
  │ propagation      │ 전달                      │                        │    
  ├──────────────────┼───────────────────────────┼────────────────────────┤ 
  │ server-side      │ BE trace를 메인으로, FE는 │ FE 복잡도 낮추고 싶을  │    
  │ tracing 위주     │  보조                     │ 때                     │    
  ├──────────────────┼───────────────────────────┼────────────────────────┤ 
  │ RUM 전용 도구    │ Datadog RUM, Elastic RUM  │ React lifecycle을 이미 │    
  │                  │ 등                        │  이해하는 도구 사용 시 │    
  └──────────────────┴───────────────────────────┴────────────────────────┘
                                                                               
  OpenTelemetry JS 공식 저장소 이슈에도 "React SPA에서 click→fetch parent-child
   연결이 안 된다"는 논의가 오래 이어지고 있을 정도로 알려진 한계입니다.
                                                                               
  데모 목적으로는 현재 구조(page.id correlation)가 실용적이고, 실제 프로덕션   
  환경에서도 충분히 사용되는 방식입니다.
```

### [참고] RUM 기준

```markdown
  ---
  필수 영역 (Core)

  1. 페이지 성능
  - Page Load Time (FCP, LCP, TTI, TTFB)
  - Web Vitals (CLS, FID/INP, LCP) — Google 기준
  - Resource 로딩 (JS, CSS, 이미지별 소요시간)

  2. 사용자 행동
  - 페이지 방문 경로 (navigation flow)
  - 세션 단위 추적 (session.id)
  - 체류 시간, 이탈 시점

  3. 오류 수집
  - JS 런타임 에러 (window.onerror, unhandledrejection)
  - API 오류 (4xx, 5xx)
  - 오류 발생 페이지/컴포넌트

  4. 네트워크
  - API 호출 응답시간
  - 실패율
  - 느린 요청 감지

  ---
  심화 영역 (Advanced)

  5. 사용자 컨텍스트
  - 브라우저/OS/디바이스 정보
  - 지역(Geo)
  - 인증된 사용자 ID

  6. BE 연계
  - FE → BE 분산 추적 (traceparent 전파)
  - 특정 사용자의 요청이 BE에서 어떻게 처리됐는지 연결

  ---
```

### GUID 추적 연결 (>> guid)
기존 Legacy 시스템에 존재하는 guid 체계와 연결 지원범위 정리

#### Baggage 전파 + Span attribute 저장
Baggage 전파로 Span 간 GUID 공유가능하도록 지원하고\
Span attribute 에 저장하여 검색 지원.\
TraceID 는 Hex 값만 허용하므로 활용하기 어려워 별도 값을 설정하여 대안방식을 적용함

### 사용자 추적 (>> session.id, user.id)
- 사용자 액션 추적: user.id 기반 행위 추적
- 로그인/로그아웃 액션 사이 추적: session.id 기반 (추적용 uuid 생성)
- 추적가능 시나리오
  1. 사용자가 어떤 화면에 접근하고 어떤 API 요청했는지 확인
  2. 사용자가 언제 로그인했는지 확인
  3. 사용자가 로그인한뒤 어떤 행위를 하고 로그아웃 했는지 확인

### Spring BE 앱 모니터링 대상

- otel sdk
  - `jvm_*` + `http_` + `db_*` 수집함
- spring actuator
  - `executor_*` + `tomcat_*` + `logback_*` + `disk_*` + `process_*` 등 추가수집함
  - otel sdk 로 부족한 경우 설정
  - micrometer 수집정보를 otlp 로 추출,전달함 (maven lib 추가 필요: micrometer-registry-otlp)
  - 4.0.x 버전은 autoconfig 호환되지 않아 micrometer metric 전송 빈을 만들어야함.
- 대시보드
  - otel sdk: JVM Overview (OpenTelemetry)
  - spring actuator: JVM (Micrometer), OpenTelemetry APM, Spring Boot Observability, Spring Boot Statistics


```markdown
JVM 메트릭 (jvm.*)

┌───────────────────────────────────┬──────────────────────────┐
│              메트릭               │           설명           │
├───────────────────────────────────┼──────────────────────────┤
│ jvm.memory.used / committed / max │ Heap/Non-Heap 메모리     │
├───────────────────────────────────┼──────────────────────────┤
│ jvm.gc.duration                   │ GC 발생 시간 (histogram) │
├───────────────────────────────────┼──────────────────────────┤
│ jvm.thread.count                  │ 스레드 수 (state별)      │
├───────────────────────────────────┼──────────────────────────┤
│ jvm.class.count                   │ 로드된 클래스 수         │
├───────────────────────────────────┼──────────────────────────┤
│ jvm.cpu.recent_utilization        │ JVM CPU 사용률           │
├───────────────────────────────────┼──────────────────────────┤
│ jvm.cpu.time                      │ JVM CPU 누적 시간        │
└───────────────────────────────────┴──────────────────────────┘

HTTP 서버 메트릭 (http.server.*)

┌──────────────────────────────┬──────────────────────────┐
│            메트릭            │           설명           │
├──────────────────────────────┼──────────────────────────┤
│ http.server.request.duration │ 요청 처리 시간 histogram │
└──────────────────────────────┴──────────────────────────┘

→ http.request.method, http.response.status_code, url.scheme, http.route 등 dimension 포함

HTTP 클라이언트 메트릭 (http.client.*)

┌──────────────────────────────┬─────────────────────────────────────────────┐
│            메트릭            │                    설명                     │
├──────────────────────────────┼─────────────────────────────────────────────┤
│ http.client.request.duration │ RestClient/RestTemplate 호출 시간 histogram │
└──────────────────────────────┴─────────────────────────────────────────────┘

DB 커넥션풀 (HikariCP 사용 시)

┌────────────────────────────────┬─────────────────────┐
│             메트릭             │        설명         │
├────────────────────────────────┼─────────────────────┤
│ db.client.connection.count     │ 커넥션 수 (state별) │
├────────────────────────────────┼─────────────────────┤
│ db.client.connection.wait_time │ 커넥션 대기 시간    │
├────────────────────────────────┼─────────────────────┤
│ db.client.connection.use_time  │ 커넥션 사용 시간    │
└────────────────────────────────┴─────────────────────┘

Spring 전용 메트릭 (Actuator 연동 시)

Spring Actuator가 있으면 Micrometer → OTel bridge가 자동 활성화되어 추가 수집:

┌────────────────────────┬─────────────────────────┐
│         메트릭         │          설명           │
├────────────────────────┼─────────────────────────┤
│ executor.*             │ ThreadPoolExecutor 상태 │
├────────────────────────┼─────────────────────────┤
│ tomcat.*               │ Tomcat 커넥션/요청 수   │
├────────────────────────┼─────────────────────────┤
│ logback.events         │ 로그 레벨별 이벤트 수   │
├────────────────────────┼─────────────────────────┤
│ disk.free / disk.total │ 디스크 사용량           │
├────────────────────────┼─────────────────────────┤
│ process.uptime         │ 프로세스 가동 시간      │
└────────────────────────┴─────────────────────────┘

```

### Spring BE: Redis 연계
- 기본으로 사용되는 Lettuce 에서 수집안되는 이슈 있음 (Jedis 교체시 정상 지원)
- 이슈버전: spring boot 4.0.4 + otel agent 2.26.0 + lettuce 6.8.2
- 해결법: DefaultClientResources 빈 등록하여 MicrometerTracing 에서 먼저 가로채는 문제 해소

### Spring BE: Kafka 연계
- 별다른 설정없이 OTEL Agent 붙이면 하나의 Trace 로 연결 추적함
- 연결 구조: Producer --(traceparent)--> Consumer
- Message Header 에 traceparent 가 들어가며, baggage 설정시 함꼐 들어감 (HTTP Header 전파방식과 동일)
- Span attribute 저장내용: topic, partition, consumer-group, operation(publish/process) 등 대부분 참고할 정보가 포함됨
  - but, header, body 는 나오지 않고 body length 정도만 나옴 

### React FE: web-vitals 성능 분석 
- trace 개별 전송: LCP/INP/CLS + TTFB/FCP 수집 (ex. web_vital.lcp 이름으로 수집)
- metric 연계: @opentelemetry/sdk-metrics 추가 or OTEL Collector spanmetrics 수집 후, Grafana 시각화
- 분석패턴: metrics 으로 전반적인 사용자경험 분석, trace 로 상세분석
  - user.id, session.id: 세션/사용자별 성능 분석
  - page.id, page.path: 페이지별 성능 분석

> web vitals 이해: https://web.dev/articles/vitals?hl=ko
> nextjs 적용: https://nextjs.org/docs/app/guides/analytics
> nextjs tracing: https://vercel.com/docs/tracing/instrumentation

### Spring BE: logging 유형별 공통처리 방안
- MDC 설정값 캡처 후 attribute 추가 방법 --> `otel.instrumentation.logback-appender.experimental.capture-mdc-attributes=*` 
- addKeyValue 방식으로 logging 시점에 추가 --> `otel.instrumentation.logback-appender.experimental.capture-key-value-pair-attributes=true`

> logback-appender: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/logback/logback-appender-1.0/javaagent/README.md

### Spring BE: Active Thread 확인 방안
- pyroscope profile 을 사용하고 trace to profile 을 통해 cpu 실행시간 확인가능함
- cpu 실행시간 측정방식은 3가지 있음: cpu / itimer / wall

| event 유형 | 측정방식                     | 특징               | 활용목적             |
|----------|----------------------------|------------------|------------------|
| cpu      | 실제 cpu 실행시간 | 물리 cpu 사용으로 정확   | cpu 과부하 분석           |
| itimer   | cpu 기반 샘플링 | 소프트웨어 방식으로 부정확하나 호환성 높음 | 일반 cpu profiling |
| wall     | 실제 경과 시간 (대기포함) | wait/block 시간 포함 | 지연분석                    |

- 수집지표:
    - process_cpu: cpu 사용시간 (itimer 만 해당)
    - wall: cpu 사용시간: blocking 포함 (wall 만 해당)
    - mutex:contentions:count: lock 경합 횟수. 스레드가 lock 시도하나 다른 스레드가 점유라 대기한 횟수
    - mutex:delay:nanoseconds: lock 경합으로 인한 대기시간(ns).
    - memory:alloc_in_new_tlab_bytes: TLAB(Thread Local Allocation Buffer)에서 새로 할당된 바이트 크기.
    - memory:alloc_in_new_tlab_objects: TLAB 에서 새로 할당된 객체 수.
- 수집지표 활용:
  - CPU 높음?  --> process_cpu 핫스팟 찾기
  - lock 대기? --> mutex:delay 경합지점 찾기
  - GC pause? --> memory:alloc 할당 많은 코드 찾기

```markdown
  mutex (lock 경합)
  ┌───────────────┬──────────────────────────────────────┐
  │     상황      │                 예시                 │                          
  ├───────────────┼──────────────────────────────────────┤
  │ 캐시 접근     │ ConcurrentHashMap, synchronized 캐시 │
  ├───────────────┼──────────────────────────────────────┤
  │ DB 커넥션 풀  │ HikariCP에서 커넥션 고갈 시 대기     │                          
  ├───────────────┼──────────────────────────────────────┤                          
  │ 로그 appender │ Logback AsyncAppender 내부 큐 경합   │                          
  ├───────────────┼──────────────────────────────────────┤                          
  │ 공유 상태     │ static 변수, 싱글톤 내부 lock        │
  └───────────────┴──────────────────────────────────────┘                          
                  
  memory:alloc
  ┌─────────────────────────┬────────────────────────────────────┐                  
  │          상황           │                예시                │
  ├─────────────────────────┼────────────────────────────────────┤                  
  │ 요청마다 대량 객체 생성 │ JSON 파싱, DTO 변환                │
  ├─────────────────────────┼────────────────────────────────────┤
  │ 불필요한 String 연산    │ 로그 포맷팅, 문자열 조합           │                  
  ├─────────────────────────┼────────────────────────────────────┤                  
  │ 컬렉션 남용             │ 루프 내 new ArrayList() 반복       │                  
  ├─────────────────────────┼────────────────────────────────────┤                  
  │ GC 압박                 │ 응답 지연이 GC pause 때문인지 확인 │
  └─────────────────────────┴────────────────────────────────────┘                  
```

- Trace to Profile 설정
  1. (Pyroscope) 설치
  2. (SDK) Java 패키지 (client)
  3. (Grafana) Tempo 데이터 소스 설정: Trace to Profile

- otel extension 을 통한 전송 설정: span 에 pyroscope.profile.id 추가, profile 에 spanId 추가하여 trace to profile 연동검색을 지원함
```bash
OTEL_JAVAAGENT_EXTENSIONS=/home/hakchangs/workspace/work/observability-demo/service/pyroscope-otel.jar;
OTEL_PYROSCOPE_ADD_PROFILE_BASELINE_URL=false;
OTEL_PYROSCOPE_ADD_PROFILE_URL=false;
OTEL_PYROSCOPE_START_PROFILING=true;
PYROSCOPE_APPLICATION_NAME=be-product;
PYROSCOPE_FORMAT=jfr;
PYROSCOPE_PROFILER_ALLOC=512k;
PYROSCOPE_PROFILER_EVENT=itimer;
PYROSCOPE_PROFILER_LOCK=10ms;
PYROSCOPE_PROFILING_INTERVAL=10ms;
PYROSCOPE_SERVER_ADDRESS=http://192.168.122.46:4040;
PYROSCOPE_UPLOAD_INTERVAL=15s
```

- 수집기준: 10ms 미만은 수집하지 않음
  - Long time 거래만 보일거고, 그중에서도 개별 클래스.메서드 수행이 짧아도 안보임. 

- OTEL Collector 경유 전송 불가 (Pyroscope 직접전송 구성 필요함)

- 실시간 조회여부(span 종료전 확인)
  - 실시간 조회됨 단, `-Dpyroscope.upload.interval` 설정시간 주기로 업데이트 됨. (default=15s, 더 짧으면 실시간 처럼 안보임)
  - 이는 Trace 수집과 무관하게 실시간 확인가능
  - 참고: Trace/Span 역시 완료전 조회됨. (미완료시 <root span not yet received> 로 조회는 되고 Trace 완료시 정상문구 나옴)

> pyroscope java 지원: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/java/
> trace to profile: https://grafana.com/docs/pyroscope/latest/view-and-analyze-profile-data/traces-to-profiles/
> trace to profile(grafana): https://grafana.com/docs/grafana-cloud/monitor-applications/profiles/traces-to-profiles/
> trace to profile(java): https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/java-span-profiles/
> pyroscope.java(상세): https://grafana.com/docs/alloy/latest/reference/components/pyroscope/pyroscope.java/
> java wall 방식: https://github.com/grafana/pyroscope/tree/main/examples/tracing/java-wall
> java itimer 방식: https://github.com/grafana/pyroscope/tree/main/examples/tracing/java
> java profile 지원범위: https://grafana.com/docs/pyroscope/latest/configure-client/profile-types/
> async-profile(pyroscope 수집기반): https://github.com/async-profiler/async-profiler/blob/b3f58429f5c0252e9ced3f0fcb444fed17671321/docs/OutputFormats.md?from_branch=master
> OTel Java Agent 단독 JFR profiling OTLP 전송 미지원(2026.03.26 Public Alpha 진입으로 공식 라이브러리에서 사용불가): https://opentelemetry.io/blog/2026/profiles-alpha/

### Spring BE: logback 레벨 변경 방법 --> spring 속성을 그대로 반영
- app 수준 레벨 변경: spring `logging.level.{logger}={level}` 방식 그대로 활용
- app 수준 레벨 반영시, collector 로 넘기는 로그 데이터를 지정할 수 있음
- app 수준에서 로그 레벨 제어권을 주어야 앱 개별적 통제가 간편하고, 레벨변경 주체를 앱에 부여할 수 있음.
