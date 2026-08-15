export const formatRupiah = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const toDate = (value) => {
  if (!value) return null;
  const s = String(value).trim();
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(s);
  const d = new Date(hasZone ? s : `${s}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatTime = (value) => {
  const d = toDate(value);
  if (!d) return '-';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
};

export const formatDate = (value) => {
  const d = toDate(value);
  if (!d) return '-';
  return d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
};
