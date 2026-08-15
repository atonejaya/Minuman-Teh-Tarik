### Task 2: Tab "Reset Data" di SettingsPage

**Files:**
- Modify: `frontend/src/modules/settings/services/SettingsApiService.js`
- Modify: `frontend/src/modules/settings/pages/SettingsPage.jsx`
- Modify: `frontend/src/styles/components.css:388-393`

**Interfaces:**
- Consumes: RPC `public.admin_reset_data(text)` dari Task 1; `useToast()` (dari `../../../components/toast/ToastContext`) dan `supabase` (dari `../../../utils/supabase`) yang sudah dipakai di SettingsPage.
- Produces: Tab `reset` baru di `SettingsPage.jsx`; method `SettingsApiService.resetData(confirm)`.

- [ ] **Step 1: Tambah method reset di SettingsApiService**

Edit `frontend/src/modules/settings/services/SettingsApiService.js`. Tambah method di dalam objek `SettingsApiService`, setelah `uploadLogo`:

```js
  async resetData(confirm) {
    const { data, error } = await supabase.rpc('admin_reset_data', { p_confirm: confirm });
    if (error) throw error;
    return data;
  },
```

Jangan lupa koma setelah blok `uploadLogo` yang sudah ada (metode sebelumnya ditutup `},`).

- [ ] **Step 2: Tambah import & state di SettingsPage**

Edit `frontend/src/modules/settings/pages/SettingsPage.jsx`:

Baris 2 â€” ganti import lucide-react menjadi:

```js
import { Building2, Coins, Hash, Users, Upload, Save, Loader2, ImageOff, Trash2, RefreshCw } from 'lucide-react';
```

Baris 8-13 â€” ganti `TABS` menjadi (tambah `reset` di akhir):

```js
const TABS = [
  { key: 'perusahaan', label: 'Perusahaan', icon: Building2 },
  { key: 'payroll', label: 'Penggajian', icon: Coins },
  { key: 'penomoran', label: 'Penomoran', icon: Hash },
  { key: 'user', label: 'Manajemen Pengguna', icon: Users },
  { key: 'reset', label: 'Reset Data', icon: Trash2 },
];
```

Baris 32-33 â€” tambah state setelah `const [saving, setSaving] = useState(false);`:

```js
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
```

- [ ] **Step 3: Tambah handler reset**

Edit `frontend/src/modules/settings/pages/SettingsPage.jsx`. Tambah handler setelah fungsi `toggleUser` (sebelum `return (`):

```js
  const handleReset = async () => {
    setResetting(true);
    try {
      await SettingsApiService.resetData(resetConfirm);
      toast.success('Semua data operasional berhasil direset');
      setResetDone(true);
    } catch (err) {
      toast.error(err.message || 'Gagal mereset data');
    } finally {
      setResetting(false);
    }
  };
```

- [ ] **Step 4: Tambah render tab reset**

Edit `frontend/src/modules/settings/pages/SettingsPage.jsx`. Di dalam `return`, SETELAH blok `{tab === 'user' && (...)}` dan SEBELUM penutup `</div>` (baris ~249), tambah:

```jsx
      {tab === 'reset' && (
        <div className="card-custom" style={{ maxWidth: '640px' }}>
          <h5 style={{ marginBottom: '16px' }}>Reset Data Operasional</h5>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--danger)',
              backgroundColor: 'color-mix(in srgb, var(--danger) 8%, var(--surface))',
              color: 'var(--danger)',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            Menghapus seluruh transaksi, kunjungan, retur, stok masuk/keluar, setoran,
            piutang, ledger, stok warung &amp; sales, batch, dan foto kunjungan.
            Data master (produk, warung, pengguna, par stock, warehouse) tetap dipertahankan.
            Tindakan ini tidak dapat dibatalkan.
          </div>

          {resetDone ? (
            <button
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={16} /> Muat Ulang Halaman
            </button>
          ) : (
            <>
              <label style={LABEL}>Konfirmasi Reset</label>
              <input
                style={INPUT}
                type="text"
                placeholder="Ketik RESET untuk mengonfirmasi"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
              />
              <button
                className="btn btn-danger"
                style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                disabled={resetConfirm !== 'RESET' || resetting}
                onClick={handleReset}
              >
                {resetting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                {resetting ? 'Menghapus...' : 'Hapus Semua Data'}
              </button>
            </>
          )}
        </div>
      )}
```

- [ ] **Step 5: Tambah CSS btn-danger**

Edit `frontend/src/styles/components.css`. Setelah baris `.btn-ghost { background: none; color: var(--text-muted); }` (baris 393), tambah:

```css
.btn-danger { background-color: var(--danger); color: #fff; }
.btn-danger:hover { background-color: color-mix(in srgb, var(--danger) 80%, #000); }
.btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }
```

- [ ] **Step 6: Verifikasi build**

Run (workdir `frontend/`):

```bash
npm run build
```

Expected: `âœ“ built in ...` tanpa error.

- [ ] **Step 7: Verifikasi lint**

Run (workdir `frontend/`):

```bash
npx oxlint src/modules/settings/pages/SettingsPage.jsx src/modules/settings/services/SettingsApiService.js
```

Expected: hanya warning pre-existing (jika ada), tanpa error baru.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/modules/settings/services/SettingsApiService.js frontend/src/modules/settings/pages/SettingsPage.jsx frontend/src/styles/components.css
git commit -m "feat(reset): tab reset data di pengaturan dengan konfirmasi RESET"
```

---


