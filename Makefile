.PHONY: help dev dev-up dev-down dev-logs dev-clean prod-up prod-down prod-logs prod-restart mongo-shell minio-console

DEV_COMPOSE := docker compose -f docker-compose.dev.yml
PROD_COMPOSE := docker compose --env-file .env.prod -f docker-compose.yml

help:
	@echo "Dev:"
	@echo "  make dev-up      - MongoDB + MinIO 컨테이너 기동"
	@echo "  make dev         - Next.js dev 서버 (호스트)"
	@echo "  make dev-down    - 컨테이너 중지"
	@echo "  make dev-logs    - dev 컨테이너 로그"
	@echo "  make dev-clean   - 컨테이너 + 볼륨 삭제 (데이터 날림)"
	@echo ""
	@echo "Prod:"
	@echo "  make prod-up     - 앱 스택 기동 (Caddy는 외부에서 관리)"
	@echo "  make prod-down   - 스택 중지"
	@echo "  make prod-logs   - 전체 로그 follow"
	@echo "  make prod-restart - app만 재시작 (env 변경 후)"
	@echo ""
	@echo "Utils:"
	@echo "  make mongo-shell   - mongosh 접속"
	@echo "  make minio-console - MinIO 콘솔 URL 안내"

dev-up:
	$(DEV_COMPOSE) up -d

dev-down:
	$(DEV_COMPOSE) down

dev-logs:
	$(DEV_COMPOSE) logs -f

dev-clean:
	$(DEV_COMPOSE) down -v

dev:
	npm run dev

prod-up:
	$(PROD_COMPOSE) up -d --build

prod-down:
	$(PROD_COMPOSE) down

prod-logs:
	$(PROD_COMPOSE) logs -f

prod-restart:
	$(PROD_COMPOSE) up -d --build app

mongo-shell:
	$(DEV_COMPOSE) exec mongo mongosh the-frame

minio-console:
	@echo "http://localhost:9001  (dev: minioadmin/minioadmin)"

backup:
	bash scripts/backup.sh
