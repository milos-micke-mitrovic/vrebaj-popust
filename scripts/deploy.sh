#!/bin/bash
# Deploy script - run after pushing code changes
# Usage: ./scripts/deploy.sh

set -e  # Exit on error

echo "=== Deploying Vrebaj Popust ==="

cd /var/www/vrebaj-popust

echo "1. Pulling latest changes..."
git pull

echo "2. Installing dependencies..."
pnpm install

echo "3. Generating Prisma client..."
pnpm prisma generate

echo "4. Building app..."
pnpm build

echo "5. Restarting PM2..."
pm2 restart vrebaj-popust

echo "=== Deploy complete ==="
