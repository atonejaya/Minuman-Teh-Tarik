import { supabase } from '../utils/supabase';

const StockRequestRepository = {
  async submitRequest(salesId, items, notes = null) {
    const { data, error } = await supabase.rpc('stock_request_submit', {
      p_sales_id: salesId,
      p_items: items,
      p_notes: notes,
    });
    if (error) throw error;
    return { success: true, requestId: data };
  },

  async approveRequest(requestId, approvedBy) {
    const { error } = await supabase.rpc('stock_request_approve', {
      p_request_id: requestId,
      p_approved_by: approvedBy,
    });
    if (error) throw error;
    return { success: true };
  },

  async rejectRequest(requestId, approvedBy, reason = null) {
    const { error } = await supabase.rpc('stock_request_reject', {
      p_request_id: requestId,
      p_approved_by: approvedBy,
      p_reason: reason,
    });
    if (error) throw error;
    return { success: true };
  },

  async getRequests({ status = '', salesId = '', page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('StockRequest')
      .select('*, sales:User!sales_id(name), approved_by_user:User!approved_by(name), items:StockRequestItem(*, product:Product(name, code), unit:Unit(name))', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (salesId) query = query.eq('sales_id', salesId);

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], meta: { total: count || 0, page, pageSize } };
  },

  async getRequestById(id) {
    const { data, error } = await supabase
      .from('StockRequest')
      .select('*, sales:User!sales_id(name), approved_by_user:User!approved_by(name), items:StockRequestItem(*, product:Product(name, code, selling_price), unit:Unit(name))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { success: true, data };
  },

  async createNotification(targetRole, title, message, link) {
    const { error } = await supabase.from('Notification').insert({
      target_role: targetRole,
      title,
      message,
      link,
    });
    if (error) console.error('Notification error:', error);
  },
};

export default StockRequestRepository;
