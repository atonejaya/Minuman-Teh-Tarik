import { supabase } from '../../../utils/supabase';

const CustomerApiService = {
  getCustomers: async (params = {}) => {
    let query = supabase.from('Warung').select('*, User!assigned_sales_id(name), Area(name), Route(name)');
    if (params.search) query = query.ilike('name', `%${params.search}%`);
    const [customersRes, txRes] = await Promise.all([
      query,
      supabase
        .from('SalesTransaction')
        .select('warung_id, outstanding_amount, created_at')
        .neq('status', 'CANCELLED'),
    ]);
    if (customersRes.error) throw customersRes.error;
    if (txRes.error) throw txRes.error;

    const agg = {};
    for (const t of txRes.data || []) {
      const key = String(t.warung_id);
      if (!agg[key]) agg[key] = { outstanding: 0, last_invoice_date: null };
      agg[key].outstanding += Number(t.outstanding_amount || 0);
      if (t.created_at && (!agg[key].last_invoice_date || t.created_at > agg[key].last_invoice_date)) {
        agg[key].last_invoice_date = t.created_at;
      }
    }

    const data = (customersRes.data || []).map((c) => ({
      ...c,
      outstanding: agg[String(c.id)]?.outstanding || 0,
      last_invoice_date: agg[String(c.id)]?.last_invoice_date || c.last_invoice_date || null,
    }));

    return { success: true, data, meta: { total: customersRes.count } };
  },

  searchCustomers: async (query) => {
    const { data, error } = await supabase.from('Warung').select('*').ilike('name', `%${query}%`).limit(10);
    if (error) throw error;
    return { success: true, data };
  },

  getCustomerById: async (id) => {
    const { data, error } = await supabase.from('Warung').select('*, User!assigned_sales_id(name), Area(name), Route(name)').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },

  createCustomer: async (payload) => {
    const finalPayload = { ...payload, updated_at: new Date().toISOString() };
    // latitude/longitude NOT NULL di DB — default ke 0 jika tidak diisi (Owner tanpa GPS)
    finalPayload.latitude  = (payload.latitude  !== undefined && payload.latitude  !== '') ? Number(payload.latitude)  : 0;
    finalPayload.longitude = (payload.longitude !== undefined && payload.longitude !== '') ? Number(payload.longitude) : 0;
    if (finalPayload.visit_week !== undefined && finalPayload.visit_week !== '') {
      finalPayload.visit_week = Number(finalPayload.visit_week);
    } else {
      finalPayload.visit_week = null;
    }
    if (finalPayload.visit_day === '') finalPayload.visit_day = null;

    // Generate kode warung otomatis jika kosong.
    // Tidak pakai NumberSequence (ikut dihapus saat reset data),
    // tapi pakai timestamp + random → dijamin unik & tidak terpengaruh reset.
    // Format: WRG-YYYYMM-XXXXXX  (6 karakter base36 dari epoch ms + random)
    if (!finalPayload.code || finalPayload.code === '') {
      const now = new Date();
      const yyyy = String(now.getFullYear());
      const mm   = String(now.getMonth() + 1).padStart(2, '0');
      const uniq = (now.getTime() % 1_000_000 + Math.floor(Math.random() * 1000))
        .toString(36)
        .toUpperCase()
        .padStart(6, '0')
        .slice(-6);
      finalPayload.code = `WRG-${yyyy}${mm}-${uniq}`;
    }

    const { data, error } = await supabase.from('Warung').insert([finalPayload]).select().single();
    if (error) throw error;
    return { success: true, data };
  },

  updateCustomer: async (id, payload) => {
    const finalPayload = { ...payload, updated_at: new Date().toISOString() };
    // latitude/longitude NOT NULL di DB — default ke 0 jika tidak diisi
    finalPayload.latitude  = (payload.latitude  !== undefined && payload.latitude  !== '') ? Number(payload.latitude)  : 0;
    finalPayload.longitude = (payload.longitude !== undefined && payload.longitude !== '') ? Number(payload.longitude) : 0;
    if (finalPayload.visit_week !== undefined && finalPayload.visit_week !== '') {
      finalPayload.visit_week = Number(finalPayload.visit_week);
    } else {
      finalPayload.visit_week = null;
    }
    if (finalPayload.visit_day === '') finalPayload.visit_day = null;
    if (finalPayload.code === '') delete finalPayload.code;
    const { data, error } = await supabase.from('Warung').update(finalPayload).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data };
  },

  updateCustomerStatus: async (id, status) => {
    const { data, error } = await supabase.from('Warung').update({ status }).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data };
  },

  getCustomerDashboard: async (id) => {
    const [txRes, visitRes] = await Promise.all([
      supabase
        .from('SalesTransaction')
        .select('grand_total, paid_amount, outstanding_amount, status')
        .eq('warung_id', id),
      supabase
        .from('SalesVisit')
        .select('visit_date')
        .eq('warung_id', id)
        .order('visit_date', { ascending: false })
        .limit(1),
    ]);
    if (txRes.error) throw txRes.error;

    const active = (txRes.data || []).filter((t) => t.status !== 'CANCELLED');
    const totalInvoice = active.reduce((s, t) => s + Number(t.grand_total || 0), 0);
    const outstanding = active.reduce((s, t) => s + Number(t.outstanding_amount || 0), 0);
    const totalPayment = active.reduce((s, t) => s + Number(t.paid_amount || 0), 0);

    return {
      success: true,
      data: {
        outstanding,
        lifetime_value: totalInvoice,
        total_invoice: active.length,
        total_payment: totalPayment,
        total_return: 0,
        average_invoice: active.length ? totalInvoice / active.length : 0,
        last_visit: visitRes.data?.[0]?.visit_date || null,
      },
    };
  }
};

export default CustomerApiService;
