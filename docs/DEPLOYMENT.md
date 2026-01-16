# Deployment Documentation

## Server

- **Provider**: DigitalOcean
- **IP**: 46.101.100.210
- **Domain**: vrebajpopust.rs
- **SSH**: `ssh root@46.101.100.210`

## Database

- **Type**: PostgreSQL
- **Port**: 5432 (must be open in firewall)
- **Database name**: vrebaj_popust
- **User**: vrebaj
- **Password**: vrebaj2024secure
- **Connection string**: `postgresql://vrebaj:vrebaj2024secure@46.101.100.210:5432/vrebaj_popust`

## Application

- **Framework**: Next.js
- **Process manager**: PM2
- **Location**: `/var/www/vrebaj-popust`
- **Port**: 3000 (internal), 80/443 (nginx proxy)

### PM2 Commands
```bash
pm2 list              # Show running processes
pm2 restart all       # Restart app
pm2 logs              # View logs
```

### Deploy Updates
```bash
cd /var/www/vrebaj-popust
git pull
pnpm build
pm2 restart all
```

## Scrapers

### GitHub Actions (Primary - runs in parallel)
- **Schedule**: 3 AM Serbian time (2:00 UTC)
- **Workflow**: `.github/workflows/nightly-scrape.yml`
- **Manual trigger**: GitHub → Actions → "Nightly Scrape" → "Run workflow"
- **Required secret**: `DATABASE_URL` in repository secrets

### DigitalOcean (Backup - runs sequentially)
```bash
cd /var/www/vrebaj-popust
nohup pnpm tsx src/scraper/index.ts >> /var/log/vrebaj-scraper.log 2>&1 &
```

### Check scraper progress
```bash
tail -f /var/log/vrebaj-scraper.log
```

### Kill running scraper
```bash
pkill -f "tsx.*scraper"
```

## Scraper Status from DO IP

Some stores block DigitalOcean IPs:

| Store | DO Status | GitHub Actions |
|-------|-----------|----------------|
| Planeta | Works | TBD |
| Buzz | Works | TBD |
| OfficeShoes | Works | TBD |
| DjakSport | Partial (2 pages) | TBD |
| N-Sport | Blocked | TBD |
| SportVision | Blocked | TBD |

## Firewall

```bash
ufw status                # Check status
ufw allow 5432/tcp        # Open PostgreSQL for GitHub Actions
ufw allow 80/tcp          # HTTP
ufw allow 443/tcp         # HTTPS
ufw allow 22/tcp          # SSH
```

## SSL Certificate

- **Provider**: Let's Encrypt
- **Method**: DNS challenge via Loopia
- **Renewal**: Auto via certbot

## Local Development

### SSH Tunnel to Database
```bash
ssh -L 5413:localhost:5432 root@46.101.100.210
```

Then use in `.env`:
```
DATABASE_URL="postgresql://vrebaj:vrebaj2024secure@localhost:5413/vrebaj_popust"
```

### Run single scraper locally
```bash
pnpm tsx src/scraper/stores/planeta.ts
```

## DNS (Loopia)

- **A Record**: vrebajpopust.rs → 46.101.100.210
- **A Record**: www.vrebajpopust.rs → 46.101.100.210

## GitHub Repository

- **URL**: https://github.com/milos-micke-mitrovic/vrebaj-popust
- **Secrets needed**: `DATABASE_URL`
