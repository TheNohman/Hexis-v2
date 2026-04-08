#!/bin/bash
set -e

HARBOR_URL="harbor.ludovic-huguenot.fr"
IMAGE_NAME="$HARBOR_URL/library/hexis-v2"
TAG="${1:-latest}"
VPS_HOST="debian@92.222.247.75"
VPS_PROJECT_DIR="/srv/projects/web/hexis-v2"

echo "==> Building Docker image..."
docker build -t "$IMAGE_NAME:$TAG" .

echo "==> Pushing to Harbor..."
docker push "$IMAGE_NAME:$TAG"

echo "==> Deploying on VPS..."
ssh "$VPS_HOST" "cd $VPS_PROJECT_DIR && docker compose pull && docker compose up -d"

echo "==> Done! App should be available at https://hexis-app.ludovic-huguenot.fr"
