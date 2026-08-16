import { supabase } from '../utils/supabase';

const VehicleMutationRepository = {
  async getMutations(params) {
    let query = supabase
      .from('WarehouseLedger')
      .select('*, sales:User!sales_id(name), product:Product(name), warehouse:Warehouse(name)', { count: 'exact' })
      .eq('reference_type', 'SalesStockReturn')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (params?.sales_id) {
      query = query.eq('sales_id', params.sales_id);
    }
    
    if (params?.date) {
      query = query.eq('transaction_date', params.date);
    }

    if (params?.page) {
      const page = params.page || 1;
      const pageSize = params.pageSize || 20;
      query = query.range((page - 1) * pageSize, page * pageSize - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    
    const pageSize = params?.pageSize || 20;
    return { data, meta: { total: count, totalPages: count ? Math.ceil(count / pageSize) : 1 } };
  }
};

export default VehicleMutationRepository;
