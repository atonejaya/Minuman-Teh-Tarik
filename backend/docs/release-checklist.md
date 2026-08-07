# Release Checklist — Minuman @One Backend

> Gunakan checklist ini setiap kali melakukan rilis ke production.
> Copy checklist ini ke issue/ticket rilis, lalu centang satu per satu.

---

## Pre-Release

### Environment

- [ ] `DATABASE_URL` benar dan bisa connect ke production DB
- [ ] `DIRECT_URL` benar (untuk migration)
- [ ] `JWT_SECRET` sudah di-set (random, ≥ 32 karakter, unik per environment)
- [ ] `CORS_ORIGIN` sudah di-set ke domain frontend production
- [ ] `NODE_ENV=production`
- [ ] `.env` tidak di-commit ke git

### Code

- [ ] Branch dari tag yang benar (baseline sprint sebelumnya)
- [ ] Semua perubahan sudah di-review
- [ ] Tidak ada merge conflict
- [ ] `git status` bersih (hanya README.md untracked — per konvensi)

### Testing

- [ ] `npm test` — semua unit test PASS
- [ ] `npm run test:integration` — semua integration test PASS
- [ ] Tidak ada test yang di-skip tanpa alasan jelas

### Database

- [ ] Backup database production dibuat sebelum deploy
  ```bash
  pg_dump ... -F c -f backup_pre_release_$(date +%Y%m%d).dump
  ```
- [ ] Migration telah di-review (tidak ada data loss)
- [ ] Migration telah ditest di staging terlebih dahulu

---

## Deploy

### Migration

- [ ] `DATABASE_URL=$DIRECT_URL npx prisma migrate deploy` berhasil
- [ ] `DATABASE_URL=$DIRECT_URL npx prisma migrate status` — semua applied

### Application

- [ ] `npm ci --only=production` berhasil
- [ ] `npx prisma generate` berhasil
- [ ] `pm2 restart minuman-backend` / `docker pull + restart` berhasil
- [ ] PM2 status: `online`

---

## Post-Deploy Verification

### Health Checks

- [ ] `GET /health` → **200** dengan `status: "ok"`
- [ ] `GET /ready` → **200** dengan `status: "ready"` dan `database: "connected"`
- [ ] `GET /version` → version benar sesuai rilis

### Functional Verification

- [ ] `POST /api/v1/auth/login` dengan kredensial valid → token diterima
- [ ] `GET /api/v1/me` dengan token valid → data user kembali
- [ ] Sample endpoint bisnis (sesuai sprint) berjalan normal

### Security Headers

- [ ] Response mengandung `X-Frame-Options`
- [ ] Response mengandung `X-Content-Type-Options: nosniff`
- [ ] `X-Request-ID` ada di setiap response

---

## Monitoring

- [ ] Monitoring aktif (Uptime Robot / Better Uptime hitting `/health`)
- [ ] Alert dikonfigurasi (notify jika `/health` gagal > 2 menit)
- [ ] Log stream dapat diakses (`pm2 logs` / Docker logs)
- [ ] Error rate di log tidak meningkat abnormal

---

## Rollback Plan

> Sudah disiapkan sebelum deploy — bukan setelah.

- [ ] Tag rilis sebelumnya sudah dicatat: `______`
- [ ] Backup database tersedia: `______` (nama file)
- [ ] Rollback command sudah disiapkan:
  ```bash
  git checkout <previous-tag>
  npm ci --only=production && npx prisma generate
  pm2 restart minuman-backend
  ```
- [ ] Tim sudah tahu siapa yang authorize rollback

---

## Sign-Off

| Peran | Nama | Tanggal | Tanda Tangan |
|---|---|---|---|
| Developer | | | |
| QA/Reviewer | | | |
| Release Manager | | | |

---

## Rilis History

| Tanggal | Tag | Deployer | Notes |
|---|---|---|---|
| 2026-08-07 | v11.2A | atonejaya | Warehouse ⇄ Sales Stock Transfer |
| | v11.3A | | Production Readiness |
