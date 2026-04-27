curl -X POST http://localhost:3000/api/folders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer glsa_vXMAVgOwxgA9rKks0FOGq3lYbSk5frmi_eebb66da" \
  -d '{
      "uid": "test-folder",
      "title": "test-folder-name"
    }'

GRAFANA_URL=http://grafana.platform.local
GRAFANA_TOKEN=glsa_vXMAVgOwxgA9rKks0FOGq3lYbSk5frmi_eebb66da

curl -X POST $GRAFANA_URL/api/folders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -d '{
      "uid": "test-svc",
      "title": "test-service-name"
    }'

curl -X POST $GRAFANA_URL/api/folders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -d '{
      "uid": "test-svc-detail",
      "title": "test-service-detail-name",
      "parentUid": "test-svc"
    }'

DS_PROMETHEUS_ID=bfhy0zihe76rkd

curl -X POST $GRAFANA_URL/api/dashboards/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -d "{
    \"dashboard\": $(cat ./svc-overview.json),
    \"inputs\": [
      {
        \"name\": \"DS_PROMETHEUS\",
        \"type\": \"datasource\",
        \"pluginId\": \"prometheus\",
        \"value\": \"$DS_PROMETHEUS_ID\"
      }
    ],
    \"overwrite\": true,
    \"folderUid\": \"test-svc\"
  }"
