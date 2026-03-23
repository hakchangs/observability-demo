# 프로젝트: Observability 데모

데모 어플리케이션과 Observability 으로 모니터링 구성

### 구성
- service
  - 통합 BE(be-bff): FE 에서 받는 요청 모두 여기를 거치며 인증, 상품 등 백엔드 연계
  - 인증 BE(be-auth): 사용자 인증
  - 상품 BE(be-product): 보험 상품 정보 가져옴
  - 가입정보 BE(be-subscription): 내가 가입한 보험정보 가져옴
  - FE(fe-web): BE 통신하고 화면을 제공함
- observability
  - LGTM: loki + grafana + tempo + mimir(or prometheus)
  - 수집기: OpenTelemetry Collector + SDK
  - e2e 모니터링: FE 부터 BE 까지 추적

### service 기술스택
- backend(BE): spring-boot 4.x + redis + rdb
- frontend(FE): react(typescript 기반)

