const PAYMENT_METHOD_LABELS = {
  CASH: 'Tunai', TRANSFER: 'Transfer', CREDIT: 'Kredit (Piutang)', EDC: 'EDC', QRIS: 'QRIS',
};

const formatNumber = (value) => new Intl.NumberFormat('id-ID').format(value || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

export const PAYMENT_METHOD_LABELS_FOR_PRINT = PAYMENT_METHOD_LABELS;

export const buildPrintHtml = (tx, company = {}) => {
  const items = tx?.items || [];
  const rows = items.map((item) => `
    <tr>
      <td>${item.product_name || item.product?.name || '-'}</td>
      <td class="center">${item.qty}</td>
      <td class="right">${formatNumber(item.selling_price)}</td>
      <td class="right">${formatNumber(item.subtotal)}</td>
    </tr>
  `).join('');

  const companyName = company.companyName || 'AtoneJaya';
  const tagline = company.tagline || 'Kesegaran Dalam Setiap Tegukan';
  const address = company.address || '';
  const phone = company.phone || '';
  const salesPhone = tx?.salesman_phone || tx?.sales?.phone || '';
  const isPaid = tx?.payment_method !== 'CREDIT' || tx?.paid_amount >= tx?.grand_total;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Faktur ${tx?.code || ''}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #000;
    width: 76mm;
    margin: 0 auto;
    padding: 4mm 2mm;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .company-name { font-size: 14px; font-weight: bold; }
  .tagline { font-size: 10px; margin-top: 2px; }
  .company-info { font-size: 10px; margin-top: 4px; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .divider-thick { border-top: 2px solid #000; margin: 6px 0; }
  .title { font-size: 13px; font-weight: bold; margin: 6px 0; }
  .info p { margin-bottom: 2px; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  th { border-bottom: 1px solid #000; padding: 3px 0; text-align: left; font-size: 11px; }
  td { padding: 2px 0; font-size: 11px; }
  .total-row { border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; font-weight: bold; }
  .lunas {
    text-align: center;
    border: 2px solid #000;
    padding: 4px;
    margin: 8px 0;
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 2px;
  }
  .footer { text-align: center; margin-top: 8px; font-size: 10px; }
  @media print {
    body { padding: 0; width: 76mm; }
    @page { width: 80mm; margin: 0; }
  }
</style>
</head>
<body>
  <div class="center">
    <div class="company-name">${companyName}</div>
    <div class="tagline">${tagline}</div>
    ${address ? `<div class="company-info">${address}</div>` : ''}
    ${phone ? `<div class="company-info">Telp: ${phone}</div>` : ''}
  </div>

  <div class="divider-thick"></div>
  <div class="title center">FAKTUR PENJUALAN</div>
  <div class="divider-thick"></div>

  <div class="info">
    <p><b>No:</b> ${tx?.code || '-'}</p>
    <p><b>Tgl:</b> ${formatDate(tx?.created_at)}</p>
    <p><b>Sales:</b> ${tx?.salesman_name || '-'}${salesPhone ? ` (${salesPhone})` : ''}</p>
    <p><b>Warung:</b> ${tx?.customer_name || '-'}</p>
    <p><b>Bayar:</b> ${PAYMENT_METHOD_LABELS[tx?.payment_method] || tx?.payment_method || '-'}</p>
  </div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="center">Qty</th>
        <th class="right">Harga</th>
        <th class="right">Sub</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4">Tidak ada item</td></tr>'}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="total-row" style="display:flex; justify-content:space-between;">
    <span>TOTAL</span>
    <span>Rp ${formatNumber(tx?.grand_total)}</span>
  </div>
  <div style="display:flex; justify-content:space-between; font-size:11px; margin-top:2px;">
    <span>Dibayar</span>
    <span>Rp ${formatNumber(tx?.paid_amount)}</span>
  </div>

  ${isPaid ? '<div class="lunas">LUNAS</div>' : '<div style="text-align:center; margin:8px 0; font-size:12px; font-weight:bold;">BELUM LUNAS</div>'}

  <div class="divider"></div>

  <div class="footer">
    Terima kasih atas kepercayaan Anda.<br />
    Barang yang sudah dibeli tidak dapat dikembalikan.
  </div>

  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
};

export const openPrintWindow = (tx, company = {}) => {
  const win = window.open('', '_blank', 'width=520,height=700');
  if (!win) return;
  win.document.write(buildPrintHtml(tx, company));
  win.document.close();
};
