
## Browser 추적 
React 기준 추적제공 범위를 정의함

### 가능범위
1. Document Load: 페이지 로딩 시점 (리로딩 없는경우 1회만 호출)
   - DocumentLoadInstrumentation 설정시 자동 수집
2. Routing(Navigation): React Route 로 SPA 방식의 리렌더링을 통한 페이지 이동
   - Custom 개발 필요: Routing 로직에 추적로직 추가 (공토처리 가능)
3. Fetch: API 호출시점에 fetch 호출시점 추적
   - FetchInstrumentation 설정시 자동 수집
4. 사용자 액션: Button 클릭 등 이벤트 기반 사용자 행위 추적
   - UserInteractionInstrumentation 설정시 자동 수집
   - event 를 button 으로 한정해도 노이즈가 심함

### page - 백엔드 추적 연계
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

### RUM 기준

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


