import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  MapPin, Camera, Package, Wallet, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Navigation,
} from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import VisitApiService from '../services/VisitApiService.js';
import { formatRupiah, formatTime } from '../../../utils/format.js';
import { openPrintWindow } from '../../../utils/printInvoice';

const STEPS = ['Check-in', 'Stok', 'Bayar', 'Selesai'];

const PAY_METHOD_LABELS = {
  CASH: 'Tunai', QRIS: 'QRIS', TRANSFER: 'Transfer', CREDIT: 'Kredit (Piutang)',
};

const PAYMENT_STATUS_LABELS = {
  PAID: 'Lunas', PARTIAL: 'Sebagian', UNPAID: 'Belum Lunas',
};

const WizardHeader = ({ step, onBack }) => (
  <div className="wizard-step-progress">
    {STEPS.map((label, i) => {
      const state = i < step ? 'done' : i === step ? 'active' : '';
      return (
        <div key={label} className={`step-dot ${state}`} title={label} />
      );
    })}
    {onBack && (
      <button className="btn-ghost" onClick={onBack} aria-label="Kembali">
        <ChevronLeft size={18} />
      </button>
    )}
  </div>
);

const VisitWizard = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [warung, setWarung] = useState(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [locating, setLocating] = useState(false);
  const [openingNote, setOpeningNote] = useState('');
  const [checkInPhoto, setCheckInPhoto] = useState(null);

  const [stockRows, setStockRows] = useState([]);
  const [result, setResult] = useState(null);

  const [payMethod, setPayMethod] = useState('CASH');
  const [payAmount, setPayAmount] = useState('');

  const [closingNote, setClosingNote] = useState('');
  const [checkOutPhoto, setCheckOutPhoto] = useState(null);

  const [visitPhotos, setVisitPhotos] = useState([]);
  const [tx, setTx] = useState(null);

  const loadTransaction = async (visitId) => {
    const { data, error: err } = await supabase
      .from('SalesTransaction')
      .select('*, items:SalesTransactionItem(*, product:Product(*))')
      .eq('visit_id', visitId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (err) throw err;
    setTx(data || null);
  };

  const loadVisitPhotos = async (visitId) => {
    const { data, error: err } = await supabase
      .from('SalesVisitPhoto')
      .select('file_path, captured_at')
      .eq('visit_id', visitId)
      .order('captured_at', { ascending: true });
    if (err) throw err;
    const urls = await Promise.all(
      (data || []).map(async (p) => {
        const { data: signed, error: serr } = await supabase
          .storage
          .from('visit-photos')
          .createSignedUrl(p.file_path, 3600);
        return serr ? null : { url: signed?.signedUrl, captured_at: p.captured_at };
      })
    );
    setVisitPhotos(urls.filter(Boolean));
  };


  const warungId = useMemo(() => {
    if (warung) return warung.id;
    const q = searchParams.get('warung');
    return q ? Number(q) : null;
  }, [warung, searchParams]);

  const stepFromStatus = (status) => {
    if (status === 'CHECKED_IN') return 1;
    if (status === 'STOCK_COUNTED') return 2;
    if (status === 'DELIVERED') return 3;
    if (status === 'COMPLETED') return 4;
    return 0;
  };

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from('SalesVisit')
          .select(`
            id, code, status, visit_date, opening_note, closing_note,
            check_in_time, check_out_time,
            warung:Warung(id, code, name, address)
          `)
          .eq('id', id)
          .single();
        if (!active) return;
        if (err) throw err;
        setVisit(data);
        setWarung(data.warung);
        setOpeningNote(data.opening_note || '');
        setStep(stepFromStatus(data.status));
        loadVisitPhotos(id).catch(() => {});
        loadTransaction(id).catch(() => {});
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (id) return undefined;
    let active = true;
    (async () => {
      try {
        if (warungId) {
          const { data, error: err } = await supabase
            .from('Warung')
            .select('id, code, name, address')
            .eq('id', warungId)
            .single();
          if (!active) return;
          if (err) throw err;
          setWarung(data);
        } else {
          if (active) navigate('/visits', { replace: true });
        }
      } catch (err) {
        if (active) setError(err.message);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, warungId]);

  const loadStock = async (targetWarungId) => {
    const { data, error: err } = await supabase
      .from('OutletParStock')
      .select('id, par_qty, product_id, product:Product(id, code, name, selling_price)')
      .eq('warung_id', targetWarungId)
      .eq('is_active', true)
      .order('id');
    if (err) throw err;
    const rows = (data || []).map((row) => ({
      product_id: row.product_id,
      code: row.product?.code || '',
      name: row.product?.name || 'Produk',
      par_qty: Number(row.par_qty || 0),
      selling_price: Number(row.product?.selling_price || 0),
      physical: Number(row.par_qty || 0),
      expired: 0,
    }));
    setStockRows(rows);
    return rows;
  };

  const handleLocate = async () => {
    setLocating(true);
    const pos = await VisitApiService.getCurrentPosition();
    setLocation(pos);
    setLocating(false);
  };

  const handleCheckIn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      let photoPath = null;
      let photoMime = null;
      if (checkInPhoto) {
        photoPath = await VisitApiService.uploadPhoto(checkInPhoto);
        photoMime = checkInPhoto.type;
      }
      if (!location.latitude || !location.longitude) {
        if (!window.confirm('Gagal mendapatkan lokasi GPS. Lanjutkan check-in tanpa koordinat lokasi?')) {
          setSubmitting(false);
          return;
        }
      }
      const { data, error: err } = await VisitApiService.checkIn({
        warungId,
        latitude: location.latitude,
        longitude: location.longitude,
        openingNote,
        photoPath,
        photoMime,
      });
      if (err) throw err;
      if (!data?.success) throw new Error('Gagal check-in');
      const visitId = data.visit_id;
      const rows = await loadStock(warungId);
      setResult((prev) => ({ ...prev, visitId }));
      navigate(`/visits/${visitId}`, { replace: true });
      setStep(1);
      if (rows.length === 0) {
        setError('Belum ada Par Stock untuk warung ini. Isi Par Stock terlebih dahulu.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalTagihan = useMemo(
    () =>
      stockRows.reduce((sum, r) => {
        const sold = Math.max(r.par_qty - Number(r.physical || 0) - Number(r.expired || 0), 0);
        return sum + sold * r.selling_price;
      }, 0),
    [stockRows]
  );

  const handleSaveStock = async () => {
    if (stockRows.length === 0) {
      setError('Tidak ada item untuk dihitung.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const items = stockRows.map((r) => ({
        product_id: r.product_id,
        physical_qty: Number(r.physical || 0),
        expired_qty: Number(r.expired || 0),
      }));
      const visitId = visit?.id || result?.visitId;
      const { data, error: err } = await VisitApiService.saveStockCount(visitId, items);
      if (err) throw err;
      if (!data?.success) throw new Error('Gagal menyimpan stok');
      setResult((prev) => ({ ...prev, ...data, grandTotal: data.grand_total }));
      setPayAmount(String(data.grand_total || 0));
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const visitId = visit?.id || result?.visitId;
      const amount = payMethod === 'CREDIT' ? null : Number(payAmount || 0);
      const { data, error: err } = await VisitApiService.recordPayment(visitId, payMethod, amount);
      if (err) throw err;
      if (!data?.success) throw new Error('Gagal mencatat pembayaran');
      setResult((prev) => ({ ...prev, ...data }));
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setSubmitting(true);
    setError(null);
    try {
      let photoPath = null;
      let photoMime = null;
      if (checkOutPhoto) {
        photoPath = await VisitApiService.uploadPhoto(checkOutPhoto);
        photoMime = checkOutPhoto.type;
      }
      const visitId = visit?.id || result?.visitId;
      const { data, error: err } = await VisitApiService.checkOut({
        visitId,
        latitude: location.latitude,
        longitude: location.longitude,
        closingNote,
        photoPath,
        photoMime,
      });
      if (err) throw err;
      if (!data?.success) throw new Error('Gagal selesai kunjungan');
      setDone(true);
      loadTransaction(visitId).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">Memuat kunjungan...</div>;

  if (done) {
    return (
      <div className="page-mobile">
        <div className="success-screen">
          <CheckCircle2 size={48} color="var(--success)" />
          <h3>Kunjungan Selesai</h3>
          <p className="text-muted">
            {warung?.name} telah diisi dan dilaporkan.
          </p>
          {tx && (
            <button
              className="btn-secondary"
              style={{ marginBottom: '10px', width: '100%' }}
              onClick={() => openPrintWindow(tx)}
            >
              Cetak Faktur
            </button>
          )}
          <button className="btn-primary" onClick={() => navigate('/visits')}>
            Kembali ke Rencana
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = visit?.status === 'COMPLETED';

  if (isCompleted) {
    return (
      <div className="page-mobile">
        <div className="wizard-card">
          <h3>{warung?.name}</h3>
          <div className="summary-row"><span>Kode</span><span>{warung?.code}</span></div>
          <div className="summary-row"><span>Status</span><span>Selesai</span></div>
          <div className="summary-row"><span>Check-in</span><span>{formatTime(visit.check_in_time)}</span></div>
          <div className="summary-row"><span>Check-out</span><span>{formatTime(visit.check_out_time)}</span></div>
          {visitPhotos.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <p className="field-label">Foto Kunjungan</p>
              <div className="visit-photo-grid">
                {visitPhotos.map((p, i) => (
                  <img
                    key={i}
                    className="visit-photo-thumb"
                    src={p.url}
                    alt={`Foto kunjungan ${i + 1}`}
                    onClick={() => window.open(p.url, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="wizard-actions">
            {tx && (
              <button className="btn-secondary" onClick={() => openPrintWindow(tx)}>
                Cetak Faktur
              </button>
            )}
            <button className="btn-primary" onClick={() => navigate('/visits')}>
              <ChevronLeft size={16} /> Rencana Kunjungan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-mobile">
      <WizardHeader step={step} onBack={step > 0 ? () => setStep(step - 1) : undefined} />

      {error && <div className="alert-error">{error}</div>}



      {step === 0 && warungId && (
        <div className="wizard-card">
          <h3>{warung?.name || 'Memuat warung...'}</h3>
          {warung && (
            <>
              <p className="text-muted">{warung.code}</p>
              <p className="visit-card-line"><MapPin size={14} /> {warung.address}</p>
            </>
          )}
          <label className="field-label">Lokasi check-in</label>
          <button className="btn-secondary" type="button" onClick={handleLocate} disabled={locating}>
            {locating ? <Loader2 size={16} className="spin" /> : <Navigation size={16} />}
            {location.latitude ? 'Lokasi terdeteksi' : 'Deteksi lokasi saya'}
          </button>
          {location.latitude && (
            <p className="location-hint">
              <CheckCircle2 size={14} /> {Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}
            </p>
          )}
          <label className="field-label">Catatan pembuka</label>
          <textarea
            className="wizard-textarea"
            value={openingNote}
            onChange={(e) => setOpeningNote(e.target.value)}
            placeholder="Kondisi warung saat datang..."
          />
          <label className="field-label">Foto check-in (opsional)</label>
          <button className="btn-secondary" type="button" onClick={() => document.getElementById('checkin-photo')?.click()}>
            <Camera size={16} /> Pilih foto
          </button>
          <input
            id="checkin-photo"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => setCheckInPhoto(e.target.files?.[0] || null)}
          />
          {checkInPhoto && (
            <img className="photo-preview" src={URL.createObjectURL(checkInPhoto)} alt="check-in" />
          )}
          <div className="wizard-actions">
            <button className="btn-primary" onClick={handleCheckIn} disabled={submitting || !warungId}>
              {submitting ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
              Mulai Kunjungan
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="wizard-card">
          <h3><Package size={18} /> Hitung Stok {warung?.name}</h3>
          <p className="text-muted" style={{ marginBottom: '8px' }}>
            Isi stok fisik. Selisih dari par stock otomatis dihitung sebagai penjualan.
          </p>
          {stockRows.length === 0 && (
            <p className="empty-hint">Belum ada Par Stock untuk warung ini.</p>
          )}
          {stockRows.length > 0 && (
            <div className="stock-row stock-row-header">
              <div className="stock-row-info">
                <span>Produk</span>
              </div>
              <span className="stock-col-label">Sisa</span>
              <span className="stock-col-label">Rusak</span>
            </div>
          )}
          {stockRows.map((row, idx) => {
            const sold = Math.max(row.par_qty - Number(row.physical || 0) - Number(row.expired || 0), 0);
            return (
              <div className="stock-row" key={row.product_id}>
                <div className="stock-row-info">
                  <p>{row.name}</p>
                  <span>Par {row.par_qty} · {formatRupiah(row.selling_price)} · Terjual {sold}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={row.physical}
                  onChange={(e) =>
                    setStockRows((prev) => prev.map((r, i) => (i === idx ? { ...r, physical: e.target.value } : r)))
                  }
                  placeholder="0"
                  aria-label={`Sisa stok ${row.name}`}
                />
                <input
                  type="number"
                  min="0"
                  value={row.expired}
                  onChange={(e) =>
                    setStockRows((prev) => prev.map((r, i) => (i === idx ? { ...r, expired: e.target.value } : r)))
                  }
                  placeholder="0"
                  aria-label={`Rusak/kadaluarsa ${row.name}`}
                />
              </div>
            );
          })}
          <div className="wizard-total">
            <span>Total Tagihan</span>
            <span>{formatRupiah(totalTagihan)}</span>
          </div>
          <div className="wizard-actions">
            <button className="btn-primary" onClick={handleSaveStock} disabled={submitting}>
              {submitting ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
              Simpan & Lanjut
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-card">
          <h3><Wallet size={18} /> Pembayaran</h3>
          <div className="summary-row">
            <span>Total Tagihan</span>
            <span>{formatRupiah(result?.grandTotal || totalTagihan)}</span>
          </div>
          <label className="field-label">Metode bayar</label>
          <div className="pay-method-grid">
            {['CASH', 'QRIS', 'TRANSFER', 'CREDIT'].map((m) => (
              <button
                key={m}
                type="button"
                className={`pay-method ${payMethod === m ? 'selected' : ''}`}
                onClick={() => {
                  setPayMethod(m);
                  if (m === 'CREDIT') setPayAmount('');
                  else setPayAmount(String(result?.grandTotal || totalTagihan || ''));
                }}
              >
                {PAY_METHOD_LABELS[m] || m}
              </button>
            ))}
          </div>
          {payMethod !== 'CREDIT' && (
            <>
              <label className="field-label">Jumlah dibayar</label>
              <input
                className="wizard-input"
                type="number"
                min="0"
                max={result?.grandTotal || totalTagihan || 0}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </>
          )}
          <div className="wizard-actions">
            <button className="btn-primary" onClick={handlePayment} disabled={submitting}>
              {submitting ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
              {payMethod === 'CREDIT' ? 'Catat Piutang' : 'Catat Pembayaran'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="wizard-card">
          <h3><CheckCircle2 size={18} /> Selesaikan Kunjungan</h3>
          <div className="summary-row"><span>Warung</span><span>{warung?.name}</span></div>
          <div className="summary-row"><span>Tagihan</span><span>{formatRupiah(result?.grandTotal || 0)}</span></div>
          <div className="summary-row"><span>Status Bayar</span><span>{PAYMENT_STATUS_LABELS[result?.payment_status] || result?.payment_status || '-'}</span></div>
          <label className="field-label">Catatan penutup</label>
          <textarea
            className="wizard-textarea"
            value={closingNote}
            onChange={(e) => setClosingNote(e.target.value)}
            placeholder="Catatan untuk laporan..."
          />
          <label className="field-label">Foto check-out (opsional)</label>
          <button className="btn-secondary" type="button" onClick={() => document.getElementById('checkout-photo')?.click()}>
            <Camera size={16} /> Pilih foto
          </button>
          <input
            id="checkout-photo"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => setCheckOutPhoto(e.target.files?.[0] || null)}
          />
          {checkOutPhoto && (
            <img className="photo-preview" src={URL.createObjectURL(checkOutPhoto)} alt="check-out" />
          )}
          <div className="wizard-actions">
            <button className="btn-primary" onClick={handleCheckOut} disabled={submitting}>
              {submitting ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
              Selesai & Serahkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitWizard;
