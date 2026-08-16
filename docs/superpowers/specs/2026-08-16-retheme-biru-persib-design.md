# Desain: Ganti Warna Orange → Biru Persib

**Tanggal:** 2026-08-16
**Status:** Disetujui user (brainstorming)
**Keputusan user:**
- Nuansa biru: **#005DA4** (Biru Persib klasik)
- Cakupan: **Semua orange jadi biru** (termasuk warning/amber, chart, badge)

## 1. Palet baru (frontend/src/index.css)

| Variabel | Lama | Baru |
|---|---|---|
| `--primary` | `hsl(28, 90%, 50%)` (Tea Orange) | `#005DA4` |
| `--primary-hover` | `hsl(28, 90%, 45%)` | `#004B86` |
| `--warning` | `hsl(40, 90%, 50%)` | `#0284C7` (biru langit, tetap beda dari primary) |

`--warning` jadi biru langit yang lebih terang agar status "peringatan" (badge, spinner GPS, tombol aksi) tetap bisa dibedakan dari tombol utama, walau sama-sama biru.

## 2. Perubahan per file

1. **`frontend/src/index.css`** — ubah `--primary`, `--primary-hover`, `--warning` sesuai tabel di atas.
2. **`frontend/src/styles/components.css`**
   - L14: focus shadow `.form-input` `rgba(230, 115, 0, 0.1)` → `rgba(0, 93, 164, 0.15)`
   - L295: teks `.badge-warning` `hsl(28, 70%, 35%)` → `hsl(207, 85%, 28%)` (biru tua, kontras di atas bg warning 18%).
3. **`frontend/src/modules/reports/pages/ReportsPage.jsx`**
   - L155: bg chart omzet `rgba(245, 116, 32, 0.7)` → `rgba(0, 93, 164, 0.7)`
   - L172: palette pie produk `#f57420` → `#005DA4` (posisi pertama). Warna pie lain (`#31506e`, `#4caf50`, `#ffc107`, `#9c27b0`, `#00bcd4`) tidak diubah.
4. **`frontend/src/modules/customer/components/CustomerStatusBadge.jsx`**
   - L7: `SUSPENDED: '#fd7e14'` → `#005DA4`.
5. **`frontend/src/modules/sales/components/SalesTransactionActivityTab.module.css`**
   - L154: `.payment` `#f97316` → `#005DA4` (masih bisa dibedakan dari `.calculated` `#3b82f6`).
6. **`frontend/src/components/shared/ServiceUnavailableState.css`**
   - L23: ikon `#f59e0b` → `#005DA4`.

## 3. Yang TIDAK diubah

- Merah / `--danger` (`#fee2e2`, `#fef2f2`, `#fecaca`, `#dc3545`, `.card-red`, `#991b1b`) — semantik danger.
- Kuning peringatan semantik (`#fef9c3`, `#fefce8`, `#fef08a`, `#854d0e`, `.card-yellow`) — bukan orange.
- Abu/netral (`#ffffff`, `#f8fafc`, `#f1f5f9`, `#6c757d`, dll).
- Palette pie lain (`#ffc107`, `#4caf50`, `#9c27b0`, `#00bcd4`, `#31506e`) — multi-warna produk, bukan orange.
- Kode non-frontend (supabase/, dsb.) dan file desain (wireframes/).

## 4. Verifikasi

1. `npm run lint` di `frontend/` — tanpa error baru.
2. `npm run build` di `frontend/` — build sukses.
3. Cek grep: tidak ada lagi `hsl(28, 90%`, `#f57420`, `#fd7e14`, `#f97316`, `#f59e0b`, `rgba(230, 115, 0` di `src/` (kecuali comment/teks non-warna).
4. Deploy ulang ke Cloudflare (`npx wrangler deploy` di `frontend/`) agar live di https://operasional.atonejaya.workers.dev.
5. Uji visual: tombol, navbar, badge, chart, spinner GPS, status badge pelanggan semua berwarna biru.
