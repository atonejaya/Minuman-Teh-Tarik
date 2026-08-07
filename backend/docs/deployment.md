# Deployment Guide — Minuman @One Backend

## Prerequisites

- Node.js 22+
- npm 10+
- PostgreSQL (via Supabase)
- PM2 (opsional, untuk production process management)
- Docker (opsional, untuk containerized deployment)

---

## Install

```bash
# Clone repository
git clone https://github.com/atonejaya/Minuman-Teh-Tarik.git
cd Minuman-Teh-Tarik/backend

# Install production dependencies only
npm ci --only=production

# Generate Prisma client
npx prisma generate
```

---

## Configure

```bash
# Copy template
cp .env.example .env

# Edit dan isi semua required variables
# Minimal: DATABASE_URL, DIRECT_URL, JWT_SECRET, CORS_ORIGIN (wajib di production)
```

---

## Database Migration

```bash
# WAJIB: gunakan DIRECT_URL (koneksi langsung, bukan pooler)
# Prisma migrate deploy tidak bisa melalui PgBouncer
DATABASE_URL=$DIRECT_URL npx prisma migrate deploy

# Verify
DATABASE_URL=$DIRECT_URL npx prisma migrate status
```

---

## Start

### Node.js Langsung

```bash
NODE_ENV=production node src/server.js
```

### PM2 (Recommended untuk VPS/Cloud)

```bash
# Start
pm2 start src/server.js --name "minuman-backend" --env production

# Cek status
pm2 status

# Lihat logs
pm2 logs minuman-backend

# Autostart saat reboot
pm2 save
pm2 startup
```

### Docker

```bash
# Build image
docker build -t minuman-backend:latest .

# Run container
docker run -d \
  --name minuman-backend \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  minuman-backend:latest

# Cek logs
docker logs -f minuman-backend

# Health check
curl http://localhost:3000/health
```

---

## Update (Zero-Downtime dengan PM2)

```bash
# Pull latest code
git pull origin main

# Install dependencies (jika ada perubahan)
npm ci --only=production

# Run migration (jika ada schema change)
DATABASE_URL=$DIRECT_URL npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Reload tanpa downtime (PM2)
pm2 reload minuman-backend

# Atau restart penuh
pm2 restart minuman-backend
```

---

## Rollback

```bash
# Lihat semua tags (versi)
git tag -l | sort -V

# Checkout ke versi sebelumnya
git checkout v11.2A  # Ganti dengan tag yang diinginkan

# Reinstall dependencies
npm ci --only=production
npx prisma generate

# Restart
pm2 restart minuman-backend
```

> **Database rollback**: Lihat `docs/production.md` seksi Rollback untuk prosedur migration rollback.

---

## Verify Deployment

```bash
# Liveness
curl https://api.minumanone.com/health

# Readiness (database)
curl https://api.minumanone.com/ready

# Version (konfirmasi deploy yang benar)
curl https://api.minumanone.com/version

# Auth sanity check
curl -X POST https://api.minumanone.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"owner","password":"<password>"}'
```

---

## Environment-Specific Notes

### Development

```bash
# Menggunakan nodemon untuk hot-reload
npx nodemon src/server.js

# Atau dengan npm script (jika ditambahkan)
npm run dev
```

### Staging

- Set `NODE_ENV=production`
- Set `CORS_ORIGIN` ke staging domain
- Gunakan database staging terpisah
- Tag: `v11.x-rc1`

### Production

- Set `NODE_ENV=production`
- Set `CORS_ORIGIN` ke production domain
- `JWT_SECRET` harus unik dan kuat
- Pastikan di belakang reverse proxy (Cloudflare/Nginx)
- Monitor `/health` dan `/ready`

---

## Port & Networking

```
Internet → Cloudflare/Nginx (443) → Backend (3000)
```

Jangan expose port 3000 langsung ke internet. Selalu gunakan reverse proxy.

**Nginx example:**

```nginx
server {
    listen 443 ssl;
    server_name api.minumanone.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;
    }
}
```
