export const formatRupiah = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID');
};
