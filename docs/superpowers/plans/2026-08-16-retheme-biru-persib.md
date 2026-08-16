# Re-theme Orange → Biru Persib Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti seluruh warna orange di aplikasi frontend menjadi biru Persib (#005DA4).

**Architecture:** Perubahan murni nilai warna (CSS variables + hex/rgba literals) di 6 file `frontend/src`. Tidak ada perubahan struktur, logika, atau perilaku. Palet warna dikontrol dari `index.css` (`--primary`, `--primary-hover`, `--warning`), sedangkan 5 lokasi orange sisanya di-ubah langsung ke nilai biru yang sepadan.

**Tech Stack:** CSS (variabel + literals), React JSX (inline style chart & badge), Vite build.

## Global Constraints

- Hanya nilai **warna orange** yang diubah. Target: `#005DA4` (biru Persib), `#004B86` (hover), `#0284C7` (warning), `rgba(0, 93, 164, 0.15/0.7)`, `hsl(207, 85%, 28%)`.
- **JANGAN sentuh:** merah/danger (`#fee2e2`, `#fef2f2`, `#fecaca`, `#dc3545`, `#991b1b`, `--danger`), kuning semantik (`#fef9c3`, `#fefce8`, `#fef08a`, `#854d0e`), abu/netral, dan palette pie selain `#f57420` (`#31506e`, `#4caf50`, `#ffc107`, `#9c27b0`, `#00bcd4`).
- Tidak menambah/menghapus baris; hanya mengganti nilai warna yang sudah ada.
- Hanya `frontend/` yang boleh berubah.
- Tanpa komentar baru pada kode (ganti komentar `/* Tea Orange */` → `/* Biru Persib */`).
- Wrorktree: kerjakan di branch terpisah (`feat/retheme-biru-persib`).

---

### Task 1: Ubah palet variabel di index.css

**Files:**
- Modify: `frontend/src/index.css:4-8`

**Interfaces:**
- Consumes: tidak ada.
- Produces: nilai baru `--primary: #005DA4`, `--primary-hover: #004B86`, `--warning: #0284C7` — dipakai seluruh komponen CSS via `var(...)`.

- [ ] **Step 1: Verifikasi kondisi "failing" (orange masih ada)**

```powershell
Select-String -Path frontend/src/index.css -Pattern "hsl\(28, 90%|hsl\(40, 90%"
```

Expected: 3 baris (L4, L5, L8) muncul — ini bukti orange masih ada sebelum diubah.

- [ ] **Step 2: Ubah nilai variabel**

Di `frontend/src/index.css`:

| Dari | Ke |
|---|---|
| `--primary: hsl(28, 90%, 50%); /* Tea Orange */` | `--primary: #005DA4; /* Biru Persib */` |
| `--primary-hover: hsl(28, 90%, 45%);` | `--primary-hover: #004B86;` |
| `--warning: hsl(40, 90%, 50%);` | `--warning: #0284C7;` |

- [ ] **Step 3: Verifikasi "passing"**

```powershell
Select-String -Path frontend/src/index.css -Pattern "#005DA4|#004B86|#0284C7"
Select-String -Path frontend/src/index.css -Pattern "hsl\(28, 90%|hsl\(40, 90%"
```

Expected: perintah pertama menampilkan 3 baris; perintah kedua kosong (tidak ada output).

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/index.css; git commit -m "style(theme): ganti warna primary & warning jadi biru persib"
```

---

### Task 2: Ubah orange hardcoded di CSS lain

**Files:**
- Modify: `frontend/src/styles/components.css:14` dan `frontend/src/styles/components.css:295`
- Modify: `frontend/src/components/shared/ServiceUnavailableState.css:23`
- Modify: `frontend/src/modules/sales/components/SalesTransactionActivityTab.module.css:154`

**Interfaces:**
- Consumes: tidak ada (nilai literal).
- Produces: tidak ada API baru — hanya nilai warna.

- [ ] **Step 1: Verifikasi kondisi "failing"**

```powershell
Get-ChildItem frontend/src -Recurse -Include *.css,*.jsx,*.js | Select-String -Pattern "rgba\(230, 115, 0|hsl\(28, 70%, 35%\)|#f59e0b|#f97316"
```

Expected: 4 baris muncul (components.css:14, components.css:295, ServiceUnavailableState.css:23, SalesTransactionActivityTab.module.css:154).

- [ ] **Step 2: Ubah nilai di 4 file**

1. `frontend/src/styles/components.css:14`
   - Dari: `box-shadow: 0 0 0 3px rgba(230, 115, 0, 0.1);`
   - Ke: `box-shadow: 0 0 0 3px rgba(0, 93, 164, 0.15);`

2. `frontend/src/styles/components.css:295`
   - Dari: `.badge-warning { background-color: color-mix(in srgb, var(--warning) 18%, var(--surface)); color: hsl(28, 70%, 35%); }`
   - Ke: `.badge-warning { background-color: color-mix(in srgb, var(--warning) 18%, var(--surface)); color: hsl(207, 85%, 28%); }`

3. `frontend/src/components/shared/ServiceUnavailableState.css:23`
   - Dari: `color: #f59e0b;`
   - Ke: `color: #005DA4;`

4. `frontend/src/modules/sales/components/SalesTransactionActivityTab.module.css:154`
   - Dari: `.payment { border-left: 3px solid #f97316; }`
   - Ke: `.payment { border-left: 3px solid #005DA4; }`

- [ ] **Step 3: Verifikasi "passing"**

```powershell
Get-ChildItem frontend/src -Recurse -Include *.css,*.jsx,*.js | Select-String -Pattern "rgba\(230, 115, 0|hsl\(28, 70%, 35%\)|#f59e0b|#f97316"
```

Expected: kosong (tidak ada output).

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/styles/components.css frontend/src/components/shared/ServiceUnavailableState.css frontend/src/modules/sales/components/SalesTransactionActivityTab.module.css; git commit -m "style(theme): ubah orange hardcoded css jadi biru persib"
```

---

### Task 3: Ubah orange inline di JSX

**Files:**
- Modify: `frontend/src/modules/reports/pages/ReportsPage.jsx:155`
- Modify: `frontend/src/modules/reports/pages/ReportsPage.jsx:172`
- Modify: `frontend/src/modules/customer/components/CustomerStatusBadge.jsx:7`

**Interfaces:**
- Consumes: tidak ada.
- Produces: tidak ada — nilai warna chart & badge berubah.

- [ ] **Step 1: Verifikasi kondisi "failing"**

```powershell
Get-ChildItem frontend/src -Recurse -Include *.css,*.jsx,*.js | Select-String -Pattern "#f57420|rgba\(245, 116, 32|#fd7e14"
```

Expected: 3 baris muncul (ReportsPage.jsx:155, ReportsPage.jsx:172, CustomerStatusBadge.jsx:7).

- [ ] **Step 2: Ubah nilai di JSX**

1. `frontend/src/modules/reports/pages/ReportsPage.jsx:155`
   - Dari: `backgroundColor: 'rgba(245, 116, 32, 0.7)',`
   - Ke: `backgroundColor: 'rgba(0, 93, 164, 0.7)',`

2. `frontend/src/modules/reports/pages/ReportsPage.jsx:172`
   - Dari: `backgroundColor: ['#f57420', '#31506e', '#4caf50', '#ffc107', '#9c27b0', '#00bcd4'] }],`
   - Ke: `backgroundColor: ['#005DA4', '#31506e', '#4caf50', '#ffc107', '#9c27b0', '#00bcd4'] }],`

3. `frontend/src/modules/customer/components/CustomerStatusBadge.jsx:7`
   - Dari: `SUSPENDED: '#fd7e14'`
   - Ke: `SUSPENDED: '#005DA4'`

- [ ] **Step 3: Verifikasi "passing"**

```powershell
Get-ChildItem frontend/src -Recurse -Include *.css,*.jsx,*.js | Select-String -Pattern "#f57420|rgba\(245, 116, 32|#fd7e14"
```

Expected: kosong (tidak ada output).

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/modules/reports/pages/ReportsPage.jsx frontend/src/modules/customer/components/CustomerStatusBadge.jsx; git commit -m "style(theme): ubah warna orange chart & badge jadi biru persib"
```

---

### Task 4: Verifikasi menyeluruh + lint + build

**Files:**
- Tidak ada perubahan kode.

**Interfaces:**
- Consumes: Task 1-3 selesai.
- Produces: dist/ siap deploy, laporan bebas orange.

- [ ] **Step 1: Grep bebas orange (menyeluruh)**

```powershell
Get-ChildItem frontend/src -Recurse -Include *.css,*.jsx,*.js,*.html | Select-String -Pattern "tea orange|hsl\(28, 90%|hsl\(28, 70%|hsl\(40, 90%|rgba\(230, 115, 0|rgba\(245, 116, 32|#f57420|#fd7e14|#f97316|#f59e0b" -CaseSensitive:$false
```

Expected: kosong (tidak ada output).

- [ ] **Step 2: Lint**

```powershell
npm run lint
```

Run di `frontend/`. Expected: exit code 0 (hanya warning lama yang sudah ada sebelumnya).

- [ ] **Step 3: Build**

```powershell
npm run build
```

Run di `frontend/`. Expected: `✓ built in ...` dan `dist/` terisi.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "chore(theme): verifikasi re-theme biru persib"
```

Note: jika output commit "nothing to commit", artinya tidak ada perubahan tambahan — skip.

---

### Task 5: Deploy ke Cloudflare

**Files:**
- Tidak ada perubahan kode.

**Interfaces:**
- Consumes: `frontend/dist/` hasil Task 4.
- Produces: aplikasi live di https://operasional.atonejaya.workers.dev.

- [ ] **Step 1: Deploy**

```powershell
npx wrangler deploy
```

Run di `frontend/`. Expected: `Uploaded operasional (...)` dan URL `https://operasional.atonejaya.workers.dev`.

- [ ] **Step 2: Verifikasi live**

```powershell
Invoke-WebRequest -Uri "https://operasional.atonejaya.workers.dev" -UseBasicParsing | Select-Object StatusCode
```

Expected: `200`.

- [ ] **Step 3: Uji visual manual (user)**

Login sebagai Owner dan Sales; cek tombol, navbar, badge status, chart laporan, spinner GPS, dan status badge pelanggan — semua tampil biru.
