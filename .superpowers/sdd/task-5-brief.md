### Task 5: Verifikasi & Deploy

**Files:**
- No new code — run checks and deploy.

- [ ] **Step 1: Jalankan seluruh test node**

Run (dari `frontend/`): `node test-payroll-utils.mjs; if ($?) { node test-sidebar-menu.mjs; if ($?) { node test-sidebar-config.mjs } }`
Expected: ketiganya PASS.

- [ ] **Step 2: Lint + build**

Run (dari `frontend/`): `npm run lint; if ($?) { npm run build }`
Expected: 0 error; build sukses.

- [ ] **Step 3: Commit hasil verifikasi**

```bash
git add -A
git commit -m "chore: verifikasi modul payroll (test, lint, build)"
```

- [ ] **Step 4: Buat PR & merge**

Pakai pola repo (GitHub API, kerja langsung di branch `main`): buat branch `feat/payroll`, push, buat PR, review, merge (rebase), delete branch. Setelah merge, sync `main`.

- [ ] **Step 5: Deploy ke Cloudflare Workers**

Run (dari `frontend/`): `npx wrangler deploy`
Expected: deploy sukses ke `https://operasional.atonejaya.workers.dev`; cek status 200 (`Invoke-WebRequest -Method Head`).

- [ ] **Step 6: Checklist verifikasi oleh USER (PENDING human)**

1. Apply `supabase/migrations/202608160003_payroll.sql` di Supabase SQL Editor.
2. Jalankan query verifikasi Task 1 Step 4 — pastikan angka masuk akal.
3. Login OWNER → menu KEUANGAN → **Gajih**: tabel per sales tampil; pilih bulan; angka cups/komisi/hari aktif/uang op/total konsisten; klik baris sales → detail per tanggal muncul; klik lagi → tertutup.
4. Menu KEUANGAN → **Biaya Operasional**: tabel per sales (hari aktif + uang op) tampil; total baris bawah benar.
5. Ubah `commission_per_cup`/`fuel_allowance` di Pengaturan → Penggajian → Gajih berubah sesuai.
6. Login SALES → menu Gajih/Biaya Operasional tidak tampil (hanya OWNER).
