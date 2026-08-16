import { supabase } from '../utils/supabase';

const SalesStockIssueRepository = {
  async getSalesStockIssues(params) {
    let query = supabase
      .from('SalesStockIssue')
      .select('*, sales:User!sales_id(name), warehouse:Warehouse(name, code)', { count: 'exact' });
    if (params?.status) query = query.eq('status', params.status);
    if (params?.sales_id) query = query.eq('sales_id', params.sales_id);
    query = query.order('created_at', { ascending: false });

    if (params?.page) {
      const page = params.page || 1;
      const pageSize = params.pageSize || 20;
      query = query.range((page - 1) * pageSize, page * pageSize - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    const pageSize = params?.pageSize || 20;
    return { data, meta: { total: count, totalPages: count ? Math.ceil(count / pageSize) : 1 } };
  },

  async getSalesStockIssue(id) {
    const { data, error } = await supabase
      .from('SalesStockIssue')
      .select('*, items:SalesStockIssueItem(*, product:Product(*), unit:Unit(name)), sales:User!sales_id(name), warehouse:Warehouse(name, code), history:SalesStockIssueHistory(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data };
  },

  async createSalesStockIssue(payload) {
    const items = payload.items && payload.items.length > 0 ? payload.items : [];
    const totalQty = items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

    const { data: header, error: headerErr } = await supabase
      .from('SalesStockIssue')
      .insert([{
        issue_number: `SSI-${Date.now()}`,
        issue_date: payload.issue_date || new Date().toISOString().slice(0, 10),
        warehouse_id: payload.warehouse_id || null,
        sales_id: payload.sales_id || null,
        status: 'DRAFT',
        total_item: items.length,
        total_qty: totalQty,
        notes: payload.notes || null,
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();
    if (headerErr) throw headerErr;

    if (items.length > 0) {
      const rows = items.map((i) => ({
        issue_id: header.id,
        product_id: i.product_id,
        qty: Number(i.qty) || 0,
        unit_id: i.unit_id || null,
        remark: i.remark || null,
      }));
      const { error: itemsErr } = await supabase.from('SalesStockIssueItem').insert(rows);
      if (itemsErr) throw itemsErr;
    }

    return { data: header };
  },

  async confirmSalesStockIssue(id) {
    const { data, error } = await supabase.rpc('sales_stock_issue_confirm', { p_issue_id: id });
    if (error) throw error;
    return { data };
  },

  async updateSalesStockIssue(id, payload) {
    const items = payload.items && payload.items.length > 0 ? payload.items : [];
    const totalQty = items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

    const { data: header, error: headerErr } = await supabase
      .from('SalesStockIssue')
      .update({
        issue_date: payload.issue_date || new Date().toISOString().slice(0, 10),
        warehouse_id: payload.warehouse_id || null,
        sales_id: payload.sales_id || null,
        total_item: items.length,
        total_qty: totalQty,
        notes: payload.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (headerErr) throw headerErr;

    const { error: delErr } = await supabase
      .from('SalesStockIssueItem')
      .delete()
      .eq('issue_id', id);
    if (delErr) throw delErr;

    if (items.length > 0) {
      const rows = items.map((i) => ({
        issue_id: id,
        product_id: i.product_id,
        qty: Number(i.qty) || 0,
        unit_id: i.unit_id || null,
        remark: i.remark || null,
      }));
      const { error: itemsErr } = await supabase.from('SalesStockIssueItem').insert(rows);
      if (itemsErr) throw itemsErr;
    }

    return { data: header };
  },

  async deleteSalesStockIssue(id) {
    const { error: itemsErr } = await supabase
      .from('SalesStockIssueItem')
      .delete()
      .eq('issue_id', id);
    if (itemsErr) throw itemsErr;

    const { data, error } = await supabase
      .from('SalesStockIssue')
      .delete()
      .eq('id', id)
      .eq('status', 'DRAFT')
      .select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Hanya pengeluaran stok berstatus DRAFT yang bisa dihapus.');
    }
    return { success: true, data };
  },

  async closeSalesStockIssue(id) {
    const { data, error } = await supabase.rpc('sales_stock_issue_close', { p_issue_id: id });
    if (error) throw error;
    
    const { data: issue } = await supabase.from('SalesStockIssue').select('sales_id, issue_number').eq('id', id).single();
    if (issue && issue.sales_id) {
      await supabase.from('Notification').insert({
        user_id: issue.sales_id,
        title: 'Stok Kendaraan Masuk',
        message: `Stok baru (${issue.issue_number}) telah masuk ke kendaraan Anda.`,
        link: '/stok-kendaraan',
      });
    }

    return { data };
  },
};

export default SalesStockIssueRepository;
