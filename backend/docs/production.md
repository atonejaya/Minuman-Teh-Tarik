# Production Guide — Minuman @One Backend

## Environment Variables

### Required (semua environment)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Supabase connection pooler URL (port 6543) | `postgresql://user:pass@host:6543/db?pgbouncer=true` |
| `JWT_SECRET` | Signing key untuk JWT — minimal 32 karakter, random | `openssl rand -hex 32` |

### Required (production only)

| Variable | Description | Example |
|---|---|---|
| `CORS_ORIGIN` | Frontend domain yang diizinkan | `https://app.minumanone.com` |

> **Fail-fast**: Jika `NODE_ENV=production` dan `CORS_ORIGIN` tidak di-set, aplikasi akan exit saat startup.

### Optional

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `API_PREFIX` | `/api/v1` | URL prefix untuk semua API route |
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `DIRECT_URL` | — | Direct DB URL untuk `prisma migrate deploy` (tanpa pooler) |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `JWT_REMEMBER_EXPIRES_IN` | `30d` | Token expiry saat "remember me" |
| `BUILD_COMMIT` | `unknown` | Git commit hash — diisi oleh CI/CD |
| `BUILD_DATE` | (runtime) | Build timestamp — diisi oleh CI/CD |
| `SUPABASE_URL` | — | Untuk file upload |
| `SUPABASE_ANON_KEY` | — | Untuk file upload |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Untuk admin file operations |
| `SUPABASE_STORAGE_BUCKET` | `uploads` | Nama storage bucket |

---

## Deployment Steps

### 1. Persiapan Server

```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2
```

### 2. Clone & Install

```bash
git clone https://github.com/atonejaya/Minuman-Teh-Tarik.git
cd Minuman-Teh-Tarik/backend
npm ci --only=production
```

### 3. Environment Setup

```bash
cp .env.example .env
nano .env  # Isi semua required variables
```

### 4. Prisma Migration

```bash
# Gunakan DIRECT_URL (bukan pooler) untuk migration
DATABASE_URL=$DIRECT_URL npx prisma migrate deploy
```

### 5. Start dengan PM2

```bash
pm2 start src/server.js --name "minuman-backend" --env production
pm2 save
pm2 startup  # Agar restart otomatis setelah reboot
```

---

## Prisma Migration

### Deploy ke Production

```bash
# WAJIB: gunakan DIRECT_URL bukan DATABASE_URL (pooler tidak support DDL)
DATABASE_URL=$DIRECT_URL npx prisma migrate deploy
```

### Verify Migration Status

```bash
DATABASE_URL=$DIRECT_URL npx prisma migrate status
```

### Generate Client (tanpa migration)

```bash
npx prisma generate
```

> **Penting**: Jangan pernah gunakan `prisma migrate dev` di production.
> `migrate dev` bisa generate shadow database dan migration baru yang tidak diinginkan.

---

## Rollback

### Application Rollback

```bash
# Lihat tag yang tersedia
git tag -l | sort -V

# Rollback ke tag sebelumnya
git checkout v11.2A
npm ci --only=production
npx prisma generate
pm2 restart minuman-backend
```

### Migration Rollback

Migration Prisma **tidak bisa otomatis di-rollback**. Prosedur manual:

1. **Identifikasi** migration yang ingin di-rollback:
   ```bash
   DATABASE_URL=$DIRECT_URL npx prisma migrate status
   ```

2. **Buat rollback SQL** secara manual (reverse dari migration file)

3. **Jalankan** via psql atau Supabase SQL editor

4. **Mark migration sebagai resolved** jika perlu:
   ```bash
   DATABASE_URL=$DIRECT_URL npx prisma migrate resolve --rolled-back <migration_name>
   ```

> **Best practice**: Selalu backup sebelum migration. Lihat seksi Backup & Restore.

---

## Backup & Restore

### Backup (pg_dump)

```bash
# Backup full database
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  -F c \
  -f backup_$(date +%Y%m%d_%H%M%S).dump

# Backup schema only
pg_dump ... --schema-only -f schema_$(date +%Y%m%d).sql

# Backup data only
pg_dump ... --data-only -f data_$(date +%Y%m%d).sql
```

### Restore (pg_restore)

```bash
# Restore full backup
PGPASSWORD=$DB_PASSWORD pg_restore \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  --clean \
  --if-exists \
  backup_20260807_120000.dump
```

> **Supabase**: Gunakan fitur backup otomatis di dashboard Supabase untuk production.
> Point-in-time recovery tersedia pada plan Pro ke atas.

---

## Health Check & Monitoring

### Liveness Probe

```
GET /health
```

- Tidak melakukan query database
- Response < 10ms
- Jika gagal: restart pod/container

```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 3600,
  "timestamp": "2026-08-07T14:00:00.000Z"
}
```

### Readiness Probe

```
GET /ready
```

- Melakukan ping database (`SELECT 1`)
- Response 200: siap menerima traffic
- Response 503: jangan route traffic ke pod ini

```json
{ "status": "ready", "database": "connected" }
```

### Version

```
GET /version
```

```json
{
  "version": "1.0.0",
  "commit": "dd09977",
  "buildDate": "2026-08-07T14:00:00.000Z",
  "node": "v22.14.0",
  "environment": "production"
}
```

### Uptime Robot / Better Uptime

Konfigurasikan monitoring untuk hit `GET /health` setiap 1 menit.
Alert jika status bukan 200 selama > 2 menit.

---

## Troubleshooting

### Aplikasi tidak bisa start

```bash
# Cek logs PM2
pm2 logs minuman-backend --lines 100

# Cek environment variables
pm2 env minuman-backend

# Test manual
NODE_ENV=production node src/server.js
```

**Kemungkinan penyebab:**
- `DATABASE_URL` salah → `PrismaClientInitializationError`
- `JWT_SECRET` kosong → exit code 1 dengan pesan jelas
- `CORS_ORIGIN` kosong di production → exit code 1
- Port sudah dipakai → `EADDRINUSE`

### Database connection errors

```bash
# Test koneksi database
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1').then(() => console.log('OK')).catch(console.error);
"
```

### Rate limit terlalu ketat

Edit `src/middleware/rate-limiter.middleware.js`:
- `apiRateLimiter`: default 100 req / 15 menit
- `loginRateLimiter`: default 5 attempts / 15 menit

### Logs tidak muncul

Pino log ke stdout. Pastikan PM2 tidak memotong output:
```bash
pm2 logs minuman-backend --raw
```

---

## Security Checklist Pre-Deploy

- [ ] `JWT_SECRET` berisi random string ≥ 32 karakter
- [ ] `CORS_ORIGIN` diisi dengan domain frontend yang benar (bukan `*`)
- [ ] `DATABASE_URL` menggunakan user dengan privilege minimal
- [ ] `.env` tidak ada di git (check `.gitignore`)
- [ ] Port 3000 tidak terbuka langsung ke internet (wajib di belakang Nginx/Cloudflare)
- [ ] `NODE_ENV=production` di-set di environment
