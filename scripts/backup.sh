#!/usr/bin/env bash
# 매일 돌리는 백업 스크립트. host의 crontab에 등록.
# 크론 예:
#   0 3 * * * /path/to/the-frame/scripts/backup.sh >> /var/log/the-frame-backup.log 2>&1

set -euo pipefail

# cron 환경에서도 사용자 로컬 바이너리 찾도록
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

DIR="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d)"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups/the-frame}"

mkdir -p "$BACKUP_ROOT/mongo" "$BACKUP_ROOT/minio"

echo "[$STAMP] mongo dump 시작"
docker compose -f "$DIR/docker-compose.yml" exec -T mongo \
    mongodump --archive --gzip --db=the-frame \
    > "$BACKUP_ROOT/mongo/the-frame-$STAMP.gz"

echo "[$STAMP] minio mirror 시작"
# mc alias 미리 설정 필요:
#   mc alias set local http://localhost:9000 <access> <secret>
mc mirror --overwrite --remove local/the-frame "$BACKUP_ROOT/minio/"

echo "[$STAMP] 30일 지난 mongo 백업 정리"
find "$BACKUP_ROOT/mongo" -name '*.gz' -mtime +30 -delete

echo "[$STAMP] 완료"
