import { supabase } from '../../../utils/supabase';

const SetoranApiService = {
  getSummary(date) {
    return supabase.rpc('get_setoran_summary', { p_date: date });
  },

  submit(date, notes) {
    return supabase.rpc('sales_setoran_submit', { p_date: date, p_notes: notes });
  },

  verify(collectionId, result, failureReason, notes, receivedAmount) {
    return supabase.rpc('sales_setoran_verify', {
      p_collection_id: collectionId,
      p_result: result,
      p_failure_reason: failureReason,
      p_notes: notes,
      p_received_amount: receivedAmount,
    });
  },

  async listCollections(statusFilter) {
    let query = supabase
      .from('Collection')
      .select(`
        id, code, collection_date, status, result, failure_reason, notes, created_at,
        sales:User(id, name),
        items:CollectionItem(id, invoice_total, payment_amount)
      `)
      .order('collection_date', { ascending: false })
      .order('id', { ascending: false });
    if (statusFilter) query = query.eq('status', statusFilter);
    const { data, error } = await query.limit(50);
    if (error) throw error;
    return data || [];
  },
};

export default SetoranApiService;
