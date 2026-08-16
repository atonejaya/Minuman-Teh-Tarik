import { supabase } from '../../../utils/supabase';

const OperationalCostApiService = {
  /** Ambil parameter biaya operasional harian dari Setting */
  async getParams() {
    const { data, error } = await supabase
      .from('Setting')
      .select('key, value')
      .eq('key', 'daily_opex_allowance');
    if (error) throw error;
    const row = (data || [])[0];
    return {
      dailyOpex: Number(row?.value) || 10000,
    };
  },

  /**
   * Hitung rekap biaya operasional harian per sales untuk bulan & tahun tertentu.
   * Modal harian = hari_kerja × daily_opex_allowance
   * Returns array of { sales_id, sales_name, hari_kerja, total_opex }
   */
  async getOpexSummary(year, month) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Hari kerja = hari yang ada SalesVisit COMPLETED
    const { data: visits, error } = await supabase
      .from('SalesVisit')
      .select('sales_id, visit_date, salesman:User!SalesVisit_sales_id_fkey(id, name)')
      .gte('visit_date', from)
      .lte('visit_date', to)
      .eq('status', 'COMPLETED');
    if (error) throw error;

    const hariMap = {}; // sales_id -> Set of dates
    const nameMap = {}; // sales_id -> name

    for (const v of visits || []) {
      if (!hariMap[v.sales_id]) {
        hariMap[v.sales_id] = new Set();
        nameMap[v.sales_id] = v.salesman?.name || `Sales #${v.sales_id}`;
      }
      hariMap[v.sales_id].add(v.visit_date);
    }

    const params = await this.getParams();
    const rows = [];

    for (const [sid, dates] of Object.entries(hariMap)) {
      const hariKerja = dates.size;
      rows.push({
        sales_id: Number(sid),
        sales_name: nameMap[sid],
        hari_kerja: hariKerja,
        total_opex: hariKerja * params.dailyOpex,
      });
    }

    rows.sort((a, b) => a.sales_name.localeCompare(b.sales_name));
    return { rows, params };
  },

  /**
   * Ambil daftar hari kerja per sales (detail harian) untuk bulan & tahun tertentu.
   */
  async getDailyDetail(year, month, salesId) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let query = supabase
      .from('SalesVisit')
      .select('id, visit_date, sales_id, salesman:User!SalesVisit_sales_id_fkey(name)')
      .gte('visit_date', from)
      .lte('visit_date', to)
      .eq('status', 'COMPLETED')
      .order('visit_date', { ascending: true });

    if (salesId) query = query.eq('sales_id', salesId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
};

export default OperationalCostApiService;
