import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Coins, Hash, Users, Upload, Save, Loader2, ImageOff, Trash2, RefreshCw, Power, PowerOff } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import SettingsApiService from '../services/SettingsApiService';
import { useCompany } from '../../../contexts/CompanyContext';
import { useToast } from '../../../components/toast/ToastContext';
import { tableCell, tableHeader } from '../../../utils/tableStyles.js';

const TABS = [
  { key: 'perusahaan', label: 'Perusahaan', icon: Building2 },
  { key: 'payroll', label: 'Penggajian', icon: Coins },
  { key: 'penomoran', label: 'Penomoran', icon: Hash },
  { key: 'user', label: 'Manajemen Pengguna', icon: Users },
  { key: 'reset', label: 'Reset Data', icon: Trash2 },
];

const CELL = tableCell;
const TH = tableHeader;
const LABEL = { display: 'block', marginBottom: '6px', fontWeight: '500', color: 'var(--text-main)' };
const INPUT = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--surface)',
  color: 'var(--text-main)',
  fontSize: '14px',
  boxSizing: 'border-box',
};

const SettingsPage = () => {
  const [tab, setTab] = useState('perusahaan');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const { settingsMap, reload } = useCompany();
  const toast = useToast();

  const [form, setForm] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    if (Object.keys(settingsMap).length > 0) {
      setForm((prev) => {
        const merged = { ...prev };
        for (const [key, value] of Object.entries(settingsMap)) {
          if (!(key in merged)) merged[key] = value;
        }
        return merged;
      });
    }
  }, [settingsMap]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('User')
        .select('id, username, name, phone, role, is_active')
        .order('name');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      toast.error(err.message || 'Gagal memuat pengguna');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (tab === 'user') loadUsers();
  }, [tab, loadUsers]);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleLogoSelect = (file) => {
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (keys) => {
    setSaving(true);
    try {
      const entries = {};
      for (const key of keys) entries[key] = form[key] ?? '';
      if (logoFile) {
        entries.company_logo_url = await SettingsApiService.uploadLogo(logoFile);
      }
      await SettingsApiService.saveAll(entries);
      setLogoFile(null);
      await reload();
      toast.success('Pengaturan berhasil disimpan');
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (u) => {
    try {
      const { error } = await supabase
        .from('User')
        .update({ is_active: !u.is_active })
        .eq('id', u.id);
      if (error) throw error;
      toast.success(u.is_active ? 'Pengguna dinonaktifkan' : 'Pengguna diaktifkan');
      loadUsers();
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui status pengguna');
    }
  };

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

  return (
    <div>
      <h2 style={{ marginBottom: '16px' }}>Pengaturan Sistem</h2>

      <div className="settings-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`settings-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'perusahaan' && (
        <div className="card-custom" style={{ maxWidth: '640px' }}>
          <h5 style={{ marginBottom: '16px' }}>Profil Perusahaan</h5>

          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL}>Logo Perusahaan</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {logoPreview || form.company_logo_url ? (
                  <img
                    src={logoPreview || form.company_logo_url}
                    alt="Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <ImageOff size={24} color="#fff" />
                )}
              </div>
              <label className="btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={16} /> Pilih Logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoSelect(file);
                  }}
                />
              </label>
            </div>
          </div>

          <Field label="Nama Perusahaan" value={form.company_name ?? ''} onChange={(v) => updateField('company_name', v)} />
          <Field label="Tagline" value={form.company_tagline ?? ''} onChange={(v) => updateField('company_tagline', v)} />
          <Field label="Alamat" value={form.company_address ?? ''} onChange={(v) => updateField('company_address', v)} />
          <Field label="Nomor Telepon" value={form.company_phone ?? ''} onChange={(v) => updateField('company_phone', v)} />

          <SaveButton saving={saving} onSave={() => handleSave(['company_name', 'company_tagline', 'company_address', 'company_phone'])} />
        </div>
      )}

      {tab === 'payroll' && (
        <div className="card-custom" style={{ maxWidth: '640px' }}>
          <h5 style={{ marginBottom: '16px' }}>Parameter Gaji & Komisi</h5>
          <Field label="Komisi per Cup Terjual (Rp)" type="number" value={form.commission_per_cup ?? ''} onChange={(v) => updateField('commission_per_cup', v)} />
          <Field label="Uang Bensin Harian (Rp)" type="number" value={form.fuel_allowance ?? ''} onChange={(v) => updateField('fuel_allowance', v)} />
          <Field label="Modal Operasional Harian (Rp)" type="number" value={form.daily_opex_allowance ?? ''} onChange={(v) => updateField('daily_opex_allowance', v)} />
          <p className="empty-hint" style={{ marginTop: '-6px', marginBottom: '14px' }}>Modal yang diberikan kepada setiap sales sebelum berangkat setiap hari kerja.</p>
          <SaveButton saving={saving} onSave={() => handleSave(['commission_per_cup', 'fuel_allowance', 'daily_opex_allowance'])} />
        </div>
      )}

      {tab === 'penomoran' && (
        <div className="card-custom" style={{ maxWidth: '640px' }}>
          <h5 style={{ marginBottom: '16px' }}>Format Penomoran Dokumen</h5>
          <Field label="Faktur (Sales Transaction)" value={form.numbering_faktur ?? ''} onChange={(v) => updateField('numbering_faktur', v)} />
          <Field label="Payment" value={form.numbering_payment ?? ''} onChange={(v) => updateField('numbering_payment', v)} />
          <Field label="Visit" value={form.numbering_visit ?? ''} onChange={(v) => updateField('numbering_visit', v)} />
          <Field label="Return" value={form.numbering_return ?? ''} onChange={(v) => updateField('numbering_return', v)} />
          <Field label="Setoran (Collection)" value={form.numbering_setoran ?? ''} onChange={(v) => updateField('numbering_setoran', v)} />
          <Field label="Stock Issue" value={form.numbering_stock_issue ?? ''} onChange={(v) => updateField('numbering_stock_issue', v)} />
          <p className="empty-hint">Gunakan token: [YYYY] tahun, [MM] bulan, [NNN] nomor urut.</p>
          <SaveButton saving={saving} onSave={() => handleSave(['numbering_faktur', 'numbering_payment', 'numbering_visit', 'numbering_return', 'numbering_setoran', 'numbering_stock_issue'])} />
        </div>
      )}

      {tab === 'user' && (
        <div className="card-custom">
          <h5 style={{ marginBottom: '16px' }}>Manajemen Pengguna</h5>
          {loading && <p className="empty-hint">Memuat pengguna...</p>}
          {!loading && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: 'var(--background)' }}>
                  <tr>
                    <th style={TH}>Nama Lengkap</th>
                    <th style={TH}>Username</th>
                    <th style={TH}>No HP</th>
                    <th style={TH}>Status</th>
                    <th style={{ ...TH, width: '60px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ ...CELL, fontWeight: '600' }}>{u.name}</td>
                      <td style={CELL}>{u.username}</td>
                      <td style={CELL}>{u.phone || '-'}</td>
                      <td style={CELL}>
                        <span className={`badge ${u.is_active ? 'badge-success' : 'badge-muted'}`}>
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td style={{ ...CELL, textAlign: 'center' }}>
                        <button
                          title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          onClick={() => toggleUser(u)}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            color: u.is_active ? 'var(--danger)' : 'var(--success)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.15s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, currentColor 10%, transparent)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {u.is_active ? <PowerOff size={15} /> : <Power size={15} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
    </div>
  );
};

const Field = ({ label, value, onChange, type = 'text' }) => (
  <div className="form-group" style={{ marginBottom: '14px' }}>
    <label style={LABEL}>{label}</label>
    <input
      style={INPUT}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const SaveButton = ({ saving, onSave }) => (
  <button className="btn btn-primary" style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={onSave} disabled={saving}>
    {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
    {saving ? 'Menyimpan...' : 'Simpan'}
  </button>
);

export default SettingsPage;
