#!/bin/bash
# Deploy script - run after pushing code changes
# Usage: ./scripts/deploy.sh
# Zero-downtime: builds first, then does quick PM2 restart

set -e  # Exit on error

echo "=== Deploying Vrebaj Popust ==="

cd /var/www/vrebaj-popust

echo "1. Pulling latest changes..."
git pull

echo "2. Installing dependencies..."
pnpm install

echo "3. Generating Prisma client..."
pnpm prisma generate

echo "4. Building app (keeping old build running)..."
# Don't delete .next - Next.js handles incremental builds
# Old .next stays active until PM2 restart
pnpm build

echo "5. Restarting PM2 (quick swap)..."
pm2 restart vrebaj-popust --update-env

echo "=== Deploy complete ==="
