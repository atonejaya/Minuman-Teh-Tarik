import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Clock, CheckCircle2, CircleDashed, Wallet } from 'lucide-react';
import VisitApiService from '../services/VisitApiService.js';
import { formatRupiah, formatTime } from '../../../utils/format.js';

const IN_PROGRESS = ['CHECKED_IN', 'STOCK_COUNTED', 'DELIVERED'];

const STATUS_LABELS = {
  PENDING: 'Menunggu',
  CHECKED_IN: 'Sudah Check-in',
  STOCK_COUNTED: 'Stok Dihitung',
  DELIVERED: 'Barang Dikirim',
  COMPLETED: 'Selesai'
};

const VisitList = () => {
  const navigate = useNavigate();
  const today = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const loadPlan = async () => {
      try {
        const { data, error: rpcError } = await VisitApiService.getPlan(today);
        if (!active) return;
        if (rpcError) throw rpcError;
        setPlan(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadPlan();
    const interval = setInterval(() => {
      if (!document.hidden) loadPlan();
    }, 20000);
    const onVisibility = () => {
      if (!document.hidden) loadPlan();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [today]);

  const { pending, completed, inProgress } = useMemo(() => {
    const pending = [];
    const completed = [];
    const inProgress = [];
    for (const item of plan) {
      if (item.status === 'COMPLETED') completed.push(item);
      else if (item.status && IN_PROGRESS.includes(item.status)) inProgress.push(item);
      else pending.push(item);
    }
    return { pending, completed, inProgress };
  }, [plan]);

  const openVisit = (item) => {
    if (item.visit_id && (item.status || '').length > 0) {
      navigate(`/visits/${item.visit_id}`);
    } else {
      navigate(`/visits/new?warung=${item.warung_id}`);
    }
  };

  const StatusPill = ({ item }) => {
    if (!item.status) {
      return (
        <span className="badge badge-muted">
          <CircleDashed size={14} /> Belum
        </span>
      );
    }
    if (item.status === 'COMPLETED') {
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={14} /> Selesai
        </span>
      );
    }
    return <span className="badge badge-warning">{STATUS_LABELS[item.status] || item.status.replace(/_/g, ' ')}</span>;
  };

  const renderCard = (item) => (
    <button key={item.warung_id} className="visit-card" onClick={() => openVisit(item)}>
      <div className="visit-card-head">
        <div>
          <h3>{item.warung_name}</h3>
          <p className="text-muted">{item.warung_code}</p>
        </div>
        <StatusPill item={item} />
      </div>
      {item.address && (
        <p className="visit-card-line">
          <MapPin size={14} /> {item.address}
        </p>
      )}
      <div className="visit-card-meta">
        {item.check_in_time && (
          <span>
            <Clock size={14} /> Check-in {formatTime(item.check_in_time)}
          </span>
        )}
        {Number(item.outstanding_amount) > 0 && (
          <span className="visit-ar">
            <Wallet size={14} /> Piutang {formatRupiah(item.outstanding_amount)}
          </span>
        )}
      </div>
    </button>
  );

  if (loading) return <div className="page-loading">Memuat rencana kunjungan...</div>;

  return (
    <div className="page-mobile">
      <div className="page-mobile-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Rencana Kunjungan</h2>
          <p className="text-muted">{today}</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="visit-section">
        <div className="visit-section-label">
          <span className="section-dot section-dot-warning" />
          Sedang berjalan
        </div>
        {inProgress.length === 0 && (
          <p className="text-muted empty-hint">Tidak ada kunjungan berjalan.</p>
        )}
        {inProgress.map(renderCard)}
      </div>

      <div className="visit-section">
        <div className="visit-section-label">
          <span className="section-dot section-dot-blue" />
          Belum dikunjungi
        </div>
        {pending.length === 0 && (
          <p className="text-muted empty-hint">Semua warung sudah dikunjungi.</p>
        )}
        {pending.map(renderCard)}
      </div>

      <div className="visit-section">
        <div className="visit-section-label">
          <span className="section-dot section-dot-success" />
          Selesai
        </div>
        {completed.length === 0 && (
          <p className="text-muted empty-hint">Belum ada kunjungan selesai hari ini.</p>
        )}
        {completed.map(renderCard)}
      </div>

      <div className="visit-summary-strip">
        <Store size={14} />
        <span>
          {pending.length + inProgress.length + completed.length} warung untuk dikunjungi hari ini
        </span>
      </div>
    </div>
  );
};

export default VisitList;
