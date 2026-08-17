import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import StockRequestRepository from '../../../repositories/StockRequestRepository';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/toast/ToastContext';
import { formatRupiah } from '../../../utils/format';
import { tableCell, tableHeader } from '../../../utils/tableStyles';

const CELL = tableCell;
const TH = tableHeader;

const STATUS_LABELS = {
  PENDING: { label: 'Menunggu', icon: Clock, color: 'var(--warning)' },
  APPROVED: { label: 'Disetujui', icon: CheckCircle2, color: 'var(--success)' },
  REJECTED: { label: 'Ditolak', icon: XCircle, color: 'var(--danger)' },
};

const StockRequestList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data } = await StockRequestRepository.getRequests({ status: filter });
      setRequests(data);
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { loadRequests(); }, [filter]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await StockRequestRepository.approveRequest(id, user.id);
      toast.success('Permintaan disetujui');
      loadRequests();
    } catch (err) {
      toast.error(err.message);
    }
    setActionLoading(null);
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await StockRequestRepository.rejectRequest(id, user.id);
      toast.success('Permintaan ditolak');
      loadRequests();
    } catch (err) {
      toast.error(err.message);
    }
    setActionLoading(null);
  };

  return (
    <div className="page-mobile">
      <div className="card-custom" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>Permintaan Stok Sales</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              {s || 'Semua'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="empty-hint">Memuat data...</p>
      ) : requests.length === 0 ? (
        <p className="empty-hint">Tidak ada permintaan stok</p>
      ) : (
        <div className="card-custom" style={{ padding: '16px' }}>
          {requests.map((req) => {
            const statusInfo = STATUS_LABELS[req.status] || STATUS_LABELS.PENDING;
            const StatusIcon = statusInfo.icon;
            return (
              <div key={req.id} style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontWeight: '600' }}>{req.request_number}</span>
                    <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {req.sales?.name || '-'}
                    </span>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: statusInfo.color, fontSize: '13px', fontWeight: '500' }}>
                    <StatusIcon size={14} /> {statusInfo.label}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {req.request_date} · {req.total_qty} item · {req.items?.length || 0} produk
                </div>
                {req.items && req.items.length > 0 && (
                  <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                    {req.items.map((item, i) => (
                      <span key={i} style={{ marginRight: '8px' }}>
                        {item.product?.name || '-'} x{item.qty}
                        {item.unit?.name ? ` ${item.unit.name}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {req.notes && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontStyle: 'italic' }}>
                    Catatan: {req.notes}
                  </div>
                )}
                {req.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleApprove(req.id)}
                      disabled={actionLoading === req.id}
                    >
                      {actionLoading === req.id ? <Loader2 size={12} className="spin" /> : <CheckCircle2 size={12} />}
                      Setujui
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--danger)', color: 'white', border: 'none' }}
                      onClick={() => handleReject(req.id)}
                      disabled={actionLoading === req.id}
                    >
                      {actionLoading === req.id ? <Loader2 size={12} className="spin" /> : <XCircle size={12} />}
                      Tolak
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StockRequestList;
