import { supabase } from '../../../utils/supabase';

const CustomerApiService = {
  getCustomers: async (params = {}) => {
    let query = supabase.from('Warung').select('*');
    if (params.search) query = query.ilike('name', `%${params.search}%`);
    const { data, error, count } = await query;
    if (error) throw error;
    return { success: true, data, meta: { total: count } };
  },

  searchCustomers: async (query) => {
    const { data, error } = await supabase.from('Warung').select('*').ilike('name', `%${query}%`).limit(10);
    if (error) throw error;
    return { success: true, data };
  },

  getCustomerById: async (id) => {
    const { data, error } = await supabase.from('Warung').select('*, user:User(name)').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },

  createCustomer: async (payload) => {
    const { data, error } = await supabase.from('Warung').insert([payload]).select().single();
    if (error) throw error;
    return { success: true, data };
  },

  updateCustomer: async (id, payload) => {
    const { data, error } = await supabase.from('Warung').update(payload).eq('id', id).select().single();
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
