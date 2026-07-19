#!/usr/bin/env bash
# 백업 파일에서 복구.
# 사용법: scripts/restore.sh <mongo-dump.gz>

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="${1:-}"

if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
    echo "사용법: $0 <mongo-dump.gz>"
    exit 1
fi

echo "mongo 복구: $DUMP"
docker compose -f "$DIR/docker-compose.yml" exec -T mongo \
    mongorestore --archive --gzip --drop < "$DUMP"

echo "MinIO 복구: mc mirror <backup-dir>/minio local/the-frame"
echo "(수동으로 실행: mc mirror --overwrite --remove <backup-dir>/minio local/the-frame)"
