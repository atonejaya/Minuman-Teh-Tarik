import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote, CheckCircle2, XCircle, Loader2, ClipboardList, Wallet, History, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import SetoranApiService from '../services/SetoranApiService.js';
import { formatRupiah, formatDate } from '../../../utils/format.js';
import { useToast } from '../../../components/toast/ToastContext';

const FAILURE_REASONS = ['CUSTOMER_NOT_FOUND', 'CUSTOMER_CLOSED', 'CUSTOMER_REFUSED', 'CUSTOMER_NO_CASH', 'CUSTOMER_PROMISE_TO_PAY', 'OTHER'];
const FAILURE_REASON_LABEL = {
  CUSTOMER_NOT_FOUND: 'Warung tidak ditemukan',
  CUSTOMER_CLOSED: 'Warung tutup',
  CUSTOMER_REFUSED: 'Warung menolak',
  CUSTOMER_NO_CASH: 'Warung tidak punya kas',
  CUSTOMER_PROMISE_TO_PAY: 'Warung berjanji membayar',
  OTHER: 'Lainnya',
};

const STATUS_LABEL = { PENDING: 'Menunggu Verifikasi', COMPLETED: 'Diverifikasi', FAILED: 'Gagal' };
const RESULT_LABEL = { FULL: 'Setoran Penuh', PARTIAL: 'Sebagian', NONE: 'Tidak Ada' };

const StatusPill = ({ status }) => {
  const cls =
    status === 'COMPLETED' ? 'badge-success' :
    status === 'PENDING' ? 'badge-warning' :
    'badge-muted';
  return <span className={`badge ${cls}`}>{STATUS_LABEL[status] || status}</span>;
};

const SetoranList = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (isOwner) return <OwnerSetoran />;
  return <SalesSetoran today={today} />;
};

/* ============================ SALES (mobile) ============================ */
const SalesSetoran = ({ today }) => {
  const [summary, setSummary] = useState({ kas_hari_ini: 0, jumlah_transaksi: 0, sudah_disetor: 0, setoran_pending: false });
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = useCallback(async () => {
    try {
      const [{ data: summaryData }, collections] = await Promise.all([
        SetoranApiService.getSummary(today),
        SetoranApiService.listCollections(),
      ]);
      setSummary(summaryData || { kas_hari_ini: 0, jumlah_transaksi: 0, sudah_disetor: 0, setoran_pending: false });
      setHistory(collections);
    } catch (err) {
      setError(err.message);
    }
  }, [today]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [{ data: summaryData }, collections] = await Promise.all([
          SetoranApiService.getSummary(today),
          SetoranApiService.listCollections(),
        ]);
        if (!active) return;
        setSummary(summaryData || { kas_hari_ini: 0, jumlah_transaksi: 0, sudah_disetor: 0, setoran_pending: false });
        setHistory(collections);
      } catch (err) {
        if (active) setError(err.message);
      }
    };
    loadData();
    const interval = setInterval(() => {
      if (!document.hidden) loadData();
    }, 20000);
    const onVisibility = () => {
      if (!document.hidden) loadData();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [today]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const { data, error: err } = await SetoranApiService.submit(today, null);
      if (err) throw err;
      const collections = data?.collections || [];
      const codes = collections.map((c) => c.code).join(', ');
      setSuccess(collections.length > 1
        ? `${collections.length} setoran diajukan (${codes}), menunggu verifikasi Owner.`
        : `Setoran ${codes} diajukan, menunggu verifikasi Owner.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const kasBelum = Number(summary.kas_hari_ini || 0);

  return (
    <div className="page-mobile">
      <div className="page-mobile-title">
        <h2>Setoran Kas</h2>
        <p className="text-muted">{formatDate(today)}</p>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <div className="setoran-hero">
        <p>Kas Tunai Dibawa</p>
        <h2>{formatRupiah(kasBelum)}</h2>
        <span>Dari {summary.jumlah_transaksi} transaksi tunai</span>
      </div>

      {summary.sudah_disetor > 0 && (
        <div className="card-custom p-3">
          <div className="summary-row">
            <span>Sudah disetor</span>
            <span>{formatRupiah(summary.sudah_disetor)}</span>
          </div>
        </div>
      )}

      <button
        className="btn-primary setoran-submit"
        onClick={handleSubmit}
        disabled={submitting || kasBelum <= 0 || summary.setoran_pending}
      >
        {submitting ? <Loader2 size={16} className="spin" /> : <Banknote size={16} />}
        {summary.setoran_pending ? 'Menunggu Verifikasi' : 'AJUKAN SETORAN'}
      </button>

      <div className="visit-section">
        <div className="visit-section-label">
          <History size={14} /> Riwayat Setoran Terbaru
        </div>
        {history.length === 0 && <p className="empty-hint">Belum ada setoran.</p>}
        {history.map((c) => (
          <div key={c.id} className="card-custom p-3 setoran-history-row">
            <div>
              <div className="setoran-history-code">{c.code}</div>
              <small className="text-muted">
                {formatDate(c.collection_date)}
                {c.sales?.name ? ` · ${c.sales.name}` : ''}
              </small>
            </div>
            <div className="setoran-history-right">
              <div className="setoran-history-amount">
                {formatRupiah(c.items?.reduce((s, i) => s + Number(i.payment_amount || 0), 0) || 0)}
              </div>
              <StatusPill status={c.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================ OWNER (web) ============================ */
const OwnerSetoran = () => {
  const toast = useToast();
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pend, hist] = await Promise.all([
        SetoranApiService.listCollections('PENDING'),
        SetoranApiService.listCollections(),
      ]);
      setPending(pend);
      setHistory(hist.filter((c) => c.status !== 'PENDING'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmVerify = async (result, failureReason, notes, receivedAmount) => {
    setVerifying(true);
    setError(null);
    try {
      const { error: err } = await SetoranApiService.verify(verifyTarget.id, result, failureReason, notes, receivedAmount);
      if (err) throw err;
      toast.success(result === 'NONE' ? 'Setoran ditandai gagal dan dikembalikan ke sales.' : 'Setoran berhasil diverifikasi.');
      setVerifyTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const totalOf = (c) => c.items?.reduce((s, i) => s + Number(i.payment_amount || 0), 0) || 0;

  if (loading) return <div className="page-loading">Memuat setoran...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '16px' }}>Verifikasi Setoran</h2>

      {error && <div className="alert-error">{error}</div>}

      <div className="card-custom" style={{ marginBottom: '24px' }}>
        <h5 style={{ marginBottom: '16px' }}>
          <ClipboardList size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          Menunggu Verifikasi
        </h5>
        {pending.length === 0 && <p className="empty-hint">Tidak ada setoran yang menunggu verifikasi.</p>}
        {pending.map((c) => (
          <div key={c.id} className="owner-setoran-row">
            <div>
              <div className="setoran-history-code">{c.code}</div>
              <small className="text-muted">
                Sales: {c.sales?.name || '-'} · {formatDate(c.collection_date)} · {c.items?.length || 0} transaksi
              </small>
            </div>
            <div className="owner-setoran-row-right">
              <div className="setoran-history-amount">{formatRupiah(totalOf(c))}</div>
              <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => setVerifyTarget(c)}>
                Verifikasi
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card-custom">
        <h5 style={{ marginBottom: '16px' }}>
          <History size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          Riwayat Setoran
        </h5>
        {history.length === 0 && <p className="empty-hint">Belum ada riwayat.</p>}
        <div style={{ overflowX: 'auto' }}>
          <table className="owner-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--background)' }}>
              <tr>
                <th style={{ padding: '12px', fontSize: '13px' }}>Kode</th>
                <th style={{ padding: '12px', fontSize: '13px' }}>Tanggal</th>
                <th style={{ padding: '12px', fontSize: '13px' }}>Sales</th>
                <th style={{ padding: '12px', fontSize: '13px' }}>Nominal</th>
                <th style={{ padding: '12px', fontSize: '13px' }}>Hasil</th>
                <th style={{ padding: '12px', fontSize: '13px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{c.code}</td>
                  <td style={{ padding: '12px' }}>{formatDate(c.collection_date)}</td>
                  <td style={{ padding: '12px' }}>{c.sales?.name || '-'}</td>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{formatRupiah(totalOf(c))}</td>
                  <td style={{ padding: '12px' }}>{RESULT_LABEL[c.result] || '-'}</td>
                  <td style={{ padding: '12px' }}><StatusPill status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {verifyTarget && (
        <VerifyModal
          collection={verifyTarget}
          verifying={verifying}
          onCancel={() => setVerifyTarget(null)}
          onConfirm={confirmVerify}
        />
      )}
    </div>
  );
};

const VerifyModal = ({ collection, verifying, onCancel, onConfirm }) => {
  const [result, setResult] = useState('FULL');
  const [failureReason, setFailureReason] = useState('OTHER');
  const [notes, setNotes] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');

  const total = collection.items?.reduce((s, i) => s + Number(i.payment_amount || 0), 0) || 0;

  const handleResult = (next) => {
    setResult(next);
    if (next === 'PARTIAL' && !receivedAmount) setReceivedAmount(String(total));
  };

  const handleConfirm = () => {
    const amount = result === 'PARTIAL' ? Number(receivedAmount) : null;
    if (result === 'PARTIAL' && (!receivedAmount || Number(receivedAmount) <= 0 || Number(receivedAmount) >= total)) {
      return;
    }
    onConfirm(result, failureReason, notes, amount);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h4>Verifikasi {collection.code}</h4>
        <p className="text-muted" style={{ marginBottom: '12px' }}>
          Sales: {collection.sales?.name} · {formatDate(collection.collection_date)} · Nominal {formatRupiah(total)}
        </p>
        <div className="pay-method-grid">
          <button className={`pay-method ${result === 'FULL' ? 'selected' : ''}`} onClick={() => handleResult('FULL')}>
            <CheckCircle2 size={16} /> Setoran Penuh
          </button>
          <button className={`pay-method ${result === 'PARTIAL' ? 'selected' : ''}`} onClick={() => handleResult('PARTIAL')}>
            <Wallet size={16} /> Sebagian
          </button>
          <button className={`pay-method ${result === 'NONE' ? 'selected' : ''}`} onClick={() => handleResult('NONE')}>
            <XCircle size={16} /> Tidak Ada
          </button>
        </div>
        {result === 'PARTIAL' && (
          <>
            <label className="field-label">Nominal diterima</label>
            <input
              type="number"
              min="0"
              step="1000"
              className="wizard-input"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              placeholder={`Maks ${formatRupiah(total - 1)}`}
            />
            <p className="verify-note"><Wallet size={14} /> Selisih {formatRupiah(total - (Number(receivedAmount) || 0))} akan dikembalikan ke kas sales.</p>
          </>
        )}
        {result === 'NONE' && (
          <>
            <label className="field-label">Alasan gagal</label>
            <select
              className="wizard-input"
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
            >
              {FAILURE_REASONS.map((r) => (
                <option key={r} value={r}>{FAILURE_REASON_LABEL[r] || r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </>
        )}
        <label className="field-label">Catatan</label>
        <textarea
          className="wizard-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={result === 'NONE' ? 'Alasan/kejadian saat penagihan...' : 'Catatan verifikasi...'}
        />
        <div className="wizard-actions">
          <button className="btn-secondary" onClick={onCancel} disabled={verifying}>Batal</button>
          <button className="btn-primary" onClick={handleConfirm} disabled={verifying}>
            {verifying ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
            Konfirmasi
          </button>
        </div>
        {result === 'NONE' && (
          <p className="verify-note"><AlertTriangle size={14} /> Setoran akan ditandai gagal dan dikembalikan ke sales.</p>
        )}
      </div>
    </div>
  );
};

export default SetoranList;
