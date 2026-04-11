# SF_SLG 배포 가이드

## 1) Render로 가장 빠르게 배포

1. GitHub에 이 프로젝트를 푸시합니다.
2. Render에서 `New +` -> `Blueprint`를 선택합니다.
3. 저장소를 연결하면 루트의 `render.yaml`을 자동 인식합니다.
4. 생성 후 환경변수를 확인합니다.

필수 환경변수:
- `JWT_SECRET`: 긴 랜덤 문자열
- `CORS_ORIGIN`: 프론트 도메인 (초기 테스트는 `*`)
- `DB_PATH`: `render.yaml` 기본값 `/var/data/game.db` 사용

헬스체크:
- `GET /health`

## 2) Docker로 직접 배포 (VPS, ECS, Fly.io 등)

빌드:
```bash
docker build -t sf-slg:latest .
```

실행:
```bash
docker run -d \
  --name sf-slg \
  -p 3000:3000 \
  -e PORT=3000 \
  -e JWT_SECRET=change-this \
  -e CORS_ORIGIN=* \
  -e DB_PATH=/data/game.db \
  -v $(pwd)/data:/data \
  sf-slg:latest
```

## 3) 배포 후 체크리스트

1. `GET /health`가 `{"ok":true,...}`로 응답하는지 확인
2. 회원가입/로그인 정상 동작 확인
3. 생산/출격/전투기록이 재시작 후에도 유지되는지 확인
4. 운영 시 `CORS_ORIGIN`을 실제 도메인으로 제한

## 4) 주의사항

- SQLite는 단일 인스턴스에 적합합니다.
- 멀티 인스턴스 운영이 필요하면 PostgreSQL로 이전하는 것이 안전합니다.
