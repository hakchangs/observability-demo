### Python troubleshoot

##### alpine 이미지 실행시점에 오류 발생: 

현상
```
ImportError: Error relocating /otel-auto-instrumentation-python/psutil/_psutil_linux.abi3.so: mallinfo: symbol not found
```

원인
- python auto-instrumentation 라이브러리가 기본 Debian 기반으로 작성되어 c 라이브러리 호환이 안됨
- alpine: musl / debian: glibc 라이브러리 지원
- alpine 구동시 glibc 계열 라이브러리 없어서 실패남

해결
- `instrumentation.opentelemetry.io/otel-python-platform: "musl"` 옵션 명시

> https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/#annotations-python-musl

##### module 오류시 로그 안남는 현상

현상
- 모듈 로딩 오류 발생시 메트릭은 수집되나 로그는 수집되지 않음

원인
- 컴파일 언어가 아니라 잘못된 모듈 임포트에 대한 방어책 없어 오류발생
- 모듈로딩 이전에 기록한 로그는 수집됨

해결
- 언어내 해결: 모듈로딩 오류가 없도록 컴파일에 준하는 확인절차 추가 or 모듈로딩 전 로깅 >> 여전히 모듈오류에 대한 로그는 안보임
- 파일로그 병행: 파일로그 병행하여 pod 에러 보완 >> 일반 앱로그(trace,service 연동가능한 otlp 전송) + 에러 로그(모듈 에러 등 앱 라이프사이클 범위 밖 로그는 filelog)
