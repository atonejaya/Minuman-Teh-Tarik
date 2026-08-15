const PAYMENT_METHOD_LABELS = {
  CASH: 'Tunai', TRANSFER: 'Transfer', CREDIT: 'Kredit (Piutang)', EDC: 'EDC', QRIS: 'QRIS',
};

const formatNumber = (value) => new Intl.NumberFormat('id-ID').format(value || 0);

export const PAYMENT_METHOD_LABELS_FOR_PRINT = PAYMENT_METHOD_LABELS;

export const buildPrintHtml = (tx) => {
  const items = tx?.items || [];
  const rows = items.map((item) => `
    <tr>
      <td>${item.product_name || item.product?.name || '-'}</td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">${formatNumber(item.selling_price)}</td>
      <td style="text-align:right">${formatNumber(item.subtotal)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Faktur ${tx?.code || ''}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 13px; color: #000; padding: 24px; }
  .nota { max-width: 380px; margin: 0 auto; }
  .center { text-align: center; }
  .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
  .title { font-size: 16px; font-weight: bold; }
  .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .info { margin-bottom: 12px; }
  .info p { margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { border-bottom: 1px solid #000; padding: 6px 2px; text-align: left; font-size: 12px; }
  td { padding: 4px 2px; }
  .total { border-top: 2px solid #000; padding-top: 8px; font-weight: bold; }
  .lunas { text-align: center; border: 2px solid #000; padding: 8px; margin: 12px 0; font-size: 15px; font-weight: bold; letter-spacing: 2px; }
  .footer { text-align: center; margin-top: 16px; font-size: 12px; }
  @media print {
    body { padding: 0; }
  }
</style>
</head>
<body>
  <div class="nota">
    <div class="header center">
      <div class="title">FAKTUR PENJUALAN</div>
      <div>${tx?.customer_name || ''}</div>
    </div>
    <div class="info">
      <p><b>No. Faktur:</b> ${tx?.code || '-'}</p>
      <p><b>Tanggal:</b> ${tx?.created_at ? new Date(tx.created_at).toLocaleDateString('id-ID') : '-'}</p>
      <p><b>Sales:</b> ${tx?.salesman_name || '-'}</p>
      <p><b>Metode:</b> ${PAYMENT_METHOD_LABELS[tx?.payment_method] || tx?.payment_method || '-'}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Harga</th>
          <th style="text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="4">Tidak ada item</td></tr>'}
      </tbody>
    </table>
    <div class="total row">
      <span>TOTAL</span>
      <span>${formatNumber(tx?.grand_total)}</span>
    </div>
    <div class="row">
      <span>Dibayar</span>
      <span>${formatNumber(tx?.paid_amount)}</span>
    </div>
    <div class="lunas">LUNAS</div>
    <div class="footer">
      Terima kasih atas kepercayaan Anda.<br />
      Barang yang sudah dibeli tidak dapat dikembalikan.
    </div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
};

export const openPrintWindow = (tx) => {
  const win = window.open('', '_blank', 'width=520,height=700');
  if (!win) return;
  win.document.write(buildPrintHtml(tx));
  win.document.close();
};
