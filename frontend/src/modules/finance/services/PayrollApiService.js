import { supabase } from '../../../utils/supabase';

const PayrollApiService = {
  /** Ambil parameter gaji dari tabel Setting */
  async getParams() {
    const { data, error } = await supabase
      .from('Setting')
      .select('key, value')
      .in('key', ['commission_per_cup', 'fuel_allowance']);
    if (error) throw error;
    const map = {};
    (data || []).forEach((r) => { map[r.key] = Number(r.value) || 0; });
    return {
      commissionPerCup: map.commission_per_cup ?? 0,
      fuelAllowance: map.fuel_allowance ?? 0,
    };
  },

  /**
   * Hitung rekap gaji per sales untuk bulan & tahun tertentu.
   * Komisi  = total qty cup terjual × commission_per_cup (dari Setting)
   * Bensin  = jumlah hari kerja (distinct visit_date COMPLETED) × fuel_allowance
   * Returns array of { sales_id, sales_name, hari_kerja, total_cup, komisi, bensin, total }
   */
  async getPayrollSummary(year, month) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // ── 1. Hari kerja per sales (distinct visit_date, status COMPLETED) ───────
    const { data: visits, error: visitErr } = await supabase
      .from('SalesVisit')
      .select('sales_id, visit_date, salesman:User!SalesVisit_sales_id_fkey(id, name)')
      .gte('visit_date', from)
      .lte('visit_date', to)
      .eq('status', 'COMPLETED');
    if (visitErr) throw visitErr;

    const hariMap = {}; // sales_id -> Set<visit_date>
    const nameMap = {}; // sales_id -> nama
    for (const v of visits || []) {
      if (!hariMap[v.sales_id]) {
        hariMap[v.sales_id] = new Set();
        nameMap[v.sales_id] = v.salesman?.name || `Sales #${v.sales_id}`;
      }
      hariMap[v.sales_id].add(v.visit_date);
    }

    // ── 2. Total cup terjual per sales ────────────────────────────────────────
    // Query dari SalesTransaction (filter tanggal & status di tabel utama),
    // lalu ambil items dengan qty — ini lebih andal daripada filter nested.
    const { data: transactions, error: txErr } = await supabase
      .from('SalesTransaction')
      .select(`
        id,
        sales_id,
        salesman:User!SalesTransaction_sales_id_fkey(id, name),
        items:SalesTransactionItem(qty)
      `)
      .gte('created_at', `${from}T00:00:00+07:00`)
      .lte('created_at', `${to}T23:59:59+07:00`)
      .eq('status', 'CONFIRMED');
    if (txErr) throw txErr;

    const cupMap = {}; // sales_id -> total qty
    for (const tx of transactions || []) {
      const sid = tx.sales_id;
      if (!sid) continue;
      const txQty = (tx.items || []).reduce((s, item) => s + Number(item.qty || 0), 0);
      cupMap[sid] = (cupMap[sid] || 0) + txQty;
      // isi nameMap dari transaksi jika belum ada dari kunjungan
      if (!nameMap[sid]) nameMap[sid] = tx.salesman?.name || `Sales #${sid}`;
      if (!hariMap[sid]) hariMap[sid] = new Set();
    }

    // ── 3. Gabung & hitung ────────────────────────────────────────────────────
    const allIds = new Set([...Object.keys(hariMap), ...Object.keys(cupMap)]);
    const params = await this.getParams();
    const rows = [];

    for (const sid of allIds) {
      const hariKerja = hariMap[sid]?.size || 0;
      const totalCup  = cupMap[sid] || 0;
      const komisi    = totalCup * params.commissionPerCup;
      const bensin    = hariKerja * params.fuelAllowance;
      rows.push({
        sales_id:   Number(sid),
        sales_name: nameMap[sid],
        hari_kerja: hariKerja,
        total_cup:  totalCup,
        komisi,
        bensin,
        total: komisi + bensin,
      });
    }

    rows.sort((a, b) => a.sales_name.localeCompare(b.sales_name));
    return { rows, params };
  },
};

export default PayrollApiService;
