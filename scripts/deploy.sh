#!/usr/bin/env bash
set -e

# 대상 라즈베리파이 주소 (환경변수 PI_HOST가 있으면 우선 사용, 없으면 기본값)
PI_HOST="${PI_HOST:-pi@172.30.1.15}"

echo "🔨 1. 프로젝트 빌드 중..."
npm run build

echo "🔍 2. 라즈베리파이의 홈브릿지 플러그인 경로 탐색 중..."
REMOTE_PATH=$(ssh -o ConnectTimeout=5 "$PI_HOST" '
  if [ -d "/var/lib/homebridge/node_modules/homebridge-smartthings-sl" ]; then
    echo "/var/lib/homebridge/node_modules/homebridge-smartthings-sl"
  elif [ -d "/var/lib/homebridge/node_modules/homebridge-smartthings-ik" ]; then
    echo "/var/lib/homebridge/node_modules/homebridge-smartthings-ik"
  else
    echo "/var/lib/homebridge/node_modules/homebridge-smartthings-sl"
  fi
')

echo "📡 라즈베리파이 타겟 경로: $REMOTE_PATH"

echo "🚀 3. 라즈베리파이로 변경 파일 동기화 중 (dist, config.schema.json, package.json)..."
rsync -avz --delete --rsync-path="sudo rsync" ./dist/ "$PI_HOST:$REMOTE_PATH/dist/"
rsync -avz --rsync-path="sudo rsync" ./config.schema.json "$PI_HOST:$REMOTE_PATH/config.schema.json"
rsync -avz --rsync-path="sudo rsync" ./package.json "$PI_HOST:$REMOTE_PATH/package.json"

# 홈브릿지 서비스 계정으로 소유권 정돈
ssh "$PI_HOST" "sudo chown -R homebridge:homebridge '$REMOTE_PATH'"

echo "🔄 4. 라즈베리파이 홈브릿지 서비스 재시작 중..."
ssh "$PI_HOST" '
  if command -v hb-service >/dev/null 2>&1; then
    sudo hb-service restart
  elif systemctl is-active --quiet homebridge; then
    sudo systemctl restart homebridge
  fi
'

echo "✅ 배포 및 홈브릿지 재시작 완료! 이제 홈 앱과 로그를 확인해 보세요."
