#

## 구성 현황
| Platform                | Version | 모드           | URL                            | Account                                                                                                                            |
|-------------------------|---------|--------------|--------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| Grafana                 | -       | -            | http://grafana.platform.local/ | admin / MsTth2q1PHLrAliWxl74pmEBueC7HOIpUKWgv3ND                                                                                   |
| VictoriaMetrics         | -       | SingleBinary | http://vm.platform.local/      | -                                                                                                                                  |
| Loki                    | -       | Distributed  | -                              | -                                                                                                                                  |
| Tempo                   | -       | Single       | -                              | -                                                                                                                                  |
| OpenTelemetry Collector | 0.147.0 | DaemonSet    | -                              | -                                                                                                                                  |
| OpenTelemetry Operator  | 0.148.0 |              |                                |                                                                                                                                    |
| kube-state-metrics      | 2.18.0  | Deployment   | -                              | -                                                                                                                                  |
| node-exporter           | 1.10.2  | DaemonSet    |                                |                                                                                                                                    |
| GitLab                  | 18.10.1 |              | http://gitlab.platform.local/  | root / nh9THWjOci4fb6NJcJIBBi481d9LpldZmnUAmepwPVbVrapAib5hhM3N6WB4YzLW (PAT: glpat-jBhj9ufuWNgAugeR95V4Sm86MQp1OjEH.01.0w0ynv9b0) |
| GitLab Runner           | 18.10.0 | ?            |                                |                                                                                                                                    |
| Harbor                  | 2.14.3  |              | https://harbor.platform.local/ | admin / Harbor12345                                                                                                                |
| ArgoCD                  | 3.3.6   |              | https://argocd.platform.local/ | admin / NmCKnGyGn7I7Tfuh                                                                                                           |

## 대시보드


## Observability

##### Grafana
> https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/

```bash
helm upgrade -i grafana ./grafana-11.3.7.tgz -f values.yaml -n platform-observability
```

##### VictoriaMetrics
> https://docs.victoriametrics.com/operator/
> https://victoriametrics.github.io/helm-charts/

설치 순서: operator > storage (> scraping) //storage 까지만 하면 저장소 및 MUI 사용가능

```bash
# sample insert
curl -i -X POST \
  --url http://vmsingle-vmsingle.platform-observability:8428/api/v1/import/prometheus \
  --header 'Content-Type: text/plain' \
  --data 'a_metric{foo="fooVal"} 123'
```

##### Loki
> https://grafana.com/docs/loki/latest/setup/install/helm/

deploymentMode 에 따라 배포설정이 달라진다.
- SingleBinary(Monolithic): filesystem 기반 tsdb 사용 (테스트용)
- Simple Scalable: 기본설정. Minio/S3 등 설정필요
- Microservice: 마찬가지 S3 설정필요할듯.

```bash
helm upgrade -i loki ./loki-9.4.0.tgz -f values.yaml -n platform-observability
```

> 멀티테넌트 모드
> - Grafana 에서 `X-Scope-OrgID: fake` 설정하여 식별이 필요함
> - 또는, `loki.auth_enabled: false` 로 비활성화처리.

```bash
LOKI_URL=http://10.43.100.54

# test data 입력
curl -s -X POST $LOKI_URL/loki/api/v1/push \
    -H "Content-Type: application/json" \
    -H "X-Scope-OrgID: fake" \
    -d "{\"streams\":[{\"stream\":{\"app\":\"test\",\"env\":\"demo\"},\"values\":[[\"$(date +%s%N)\",\"hello loki test log\"]]}]}"

# 확인
curl -s $LOKI_URL/loki/api/v1/labels -H 'X-Scope-OrgID: fake'
```

##### Tempo
> https://grafana.com/docs/tempo/latest/set-up-for-tracing/setup-tempo/deploy/kubernetes/helm-chart/

```bash
TEMPO_DISTRIBUTOR=http://10.43.240.67:4318

# test data 입력
curl -s -X POST $TEMPO_DISTRIBUTOR/v1/traces \
-H "Content-Type: application/json" \
-d "{
  \"resourceSpans\": [{
    \"resource\": {\"attributes\": [{\"key\": \"service.name\", \"value\": {\"stringValue\": \"test-service\"}}]},
    \"scopeSpans\": [{
      \"spans\": [{
        \"traceId\": \"0af7651916cd43dd8448eb211c80319c\",
        \"spanId\": \"b7ad6b7169203331\",
        \"name\": \"test-span\",
        \"startTimeUnixNano\": \"$(date +%s%N)\",
        \"endTimeUnixNano\": \"$(date +%s%N)\",
        \"kind\": 1,
        \"status\": {}
      }]
    }]
  }]
}"

# 확인
TEMPO_QUERY_FRONTEND=http://10.43.73.147:3200
curl $TEMPO_QUERY_FRONTEND/api/search
```

##### OTEL Collector
> https://opentelemetry.io/docs/collector/install/kubernetes/

helm chart 옵션으로 presets(k8s)을 제공함 
- log collection: container log 수집 (경로: Filelog receiver > /var/log/pods/*/*/*.log)
- kubernetes attributes: k8s metadata 추가 (경로: Kubernetes Attributes processor > k8s.pod.name, k8s.namespace.name, and k8s.node.name)
- kubelet metrics: node, pod, container 메트릭 수집 (경로: Kubeletstats receiver > kube-apiserver > kubelet)
- cluster metrics: 클러스터 수준 메트릭 수집 (경로: Kubernetes Cluster receiver > kube-apiserver > kube-state-metrics)
- kubernetes events: k8s event 수집 (경로: Kubernetes Objects Receiver)
- host metrics: 호스트 메트릭 수집 (경로: Host Metrics receiver > )

##### kube-state-metrics
> https://github.com/kubernetes/kube-state-metrics?tab=readme-ov-file#helm-chart

##### node-exporter
> https://github.com/prometheus/node_exporter
> https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus-node-exporter/README.md

##### kube-prometheus-stack dashboard: k8s 관련 많이 있음.

```bash
helm template kube-prometheus-stack prometheus-community/kube-prometheus-stack \
--set grafana.enabled=true \
--set prometheus.enabled=false \
--set alertmanager.enabled=false \
-s templates/grafana/dashboards-1.14/k8s-resources-cluster.yaml \
> dashboards.yaml
```

```bash
cat dashboards.yaml | python3 -c " 
import sys, json, yaml
docs = list(yaml.safe_load_all(sys.stdin))
for doc in docs:
  if doc and doc.get('kind') == 'ConfigMap':
    for k, v in doc['data'].items():
      with open(k, 'w') as f:
        f.write(v)
        print('saved:', k)
"
```

##### GitLab
> https://docs.gitlab.com/charts/

```bash
### to create fsnotify watcher: too many open files 대응
# 노드 ulimit 올리기
vi /etc/security/limits.conf
---
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
---

# systemd limit 올리기
vi /etc/systemd/system.conf
---
DefaultLimitNOFILE=65536
---
vi /etc/systemd/user.conf
---
DefaultLimitNOFILE=65536
---

systemctl daemon-reexec
reboot
```

##### GitLab Runner
GitLab 바라보는 인증서를 설정해주어야함.

##### Harbor
> https://github.com/goharbor/harbor-helm

##### ArgoCD
> https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
> https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd#installing-the-chart

> ssl-passthrough 문제
> - argocd 내부 백엔드에 ssl 로 전달되어 인증실패 후 리다렉트 계속 시도.
> - helm `server.extraArgs=["--insecure"]` 로 백엔드 서버 인증 무시처리

##### OTEL Operator
> https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/



