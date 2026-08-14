import React from 'react';

const statusLabels = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif',
  BLACKLIST: 'Blacklist',
  DRAFT: 'Draft',
  COMPLETED: 'Selesai',
  PENDING: 'Menunggu',
  CONFIRMED: 'Terkonfirmasi',
  CANCELLED: 'Dibatalkan',
  REJECTED: 'Ditolak',
  APPROVED: 'Disetujui',
  CLOSED: 'Ditutup',
  RECEIVED: 'Diterima',
  PAID: 'Lunas',
  PARTIAL: 'Sebagian',
  UNPAID: 'Belum Lunas',
  CHECKED_IN: 'Check-in',
  STOCK_COUNTED: 'Stok Dihitung',
  DELIVERED: 'Dikirim',
  HIGH: 'Prioritas Tinggi',
  MEDIUM: 'Prioritas Sedang',
  LOW: 'Prioritas Rendah',
};

const StatusBadge = ({ status }) => {
  const getBadgeColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'CONFIRMED':
      case 'APPROVED':
      case 'RECEIVED':
      case 'CLOSED':
      case 'PAID':
      case 'DELIVERED': return 'success';
      case 'INACTIVE':
      case 'UNPAID': return 'secondary';
      case 'BLACKLIST':
      case 'REJECTED':
      case 'CANCELLED': return 'danger';
      case 'DRAFT':
      case 'PENDING':
      case 'PARTIAL': return 'warning';
      case 'COMPLETED':
      case 'CHECKED_IN':
      case 'STOCK_COUNTED':
      case 'MEDIUM': return 'primary';
      case 'HIGH':
      case 'LOW': return 'light';
      default: return 'light';
    }
  };

  return (
    <span className={`badge bg-${getBadgeColor(status)}`}>
      {statusLabels[status?.toUpperCase()] || status}
    </span>
  );
};

export default StatusBadge;
