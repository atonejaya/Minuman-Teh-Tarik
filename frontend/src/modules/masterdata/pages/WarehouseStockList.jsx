import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../utils/supabase';
import EntityListPage from '../../../components/entity/EntityListPage';

const cell = { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };

const WarehouseStockTable = ({ data, loading }) => {
  if (loading) {
    return <p style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data stok...</p>;
  }

  if (!data || data.length === 0) {
    return <p style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada data stok gudang.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: 'var(--background)' }}>
          <tr>
            <th style={cell}>Gudang</th>
            <th style={cell}>Kode Produk</th>
            <th style={cell}>Nama Produk</th>
            <th style={cell}>Kategori</th>
            <th style={cell}>Sisa Stok (Tersedia)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={`${item.warehouse_id}-${item.product_id}`}>
              <td style={{ ...cell, fontWeight: '500' }}>{item.warehouse?.name || '-'}</td>
              <td style={cell}>{item.product?.code || '-'}</td>
              <td style={cell}>{item.product?.name || '-'}</td>
              <td style={cell}>{item.product?.category?.name || '-'}</td>
              <td style={{ ...cell, fontWeight: '600', color: item.qty_available > 0 ? 'var(--success)' : 'var(--danger)' }}>
                {item.qty_available}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const WarehouseStockList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const pageSize = 20;
      const { data: stockData, error, count } = await supabase
        .from('WarehouseStock')
        .select(`
          *,
          warehouse:Warehouse(name),
          product:Product(code, name, category:ProductCategory(name))
        `, { count: 'exact' })
        .order('warehouse_id')
        .range((page - 1) * pageSize, page * pageSize - 1);
        
      if (error) throw error;
      
      setData(stockData || []);
      setTotalPages(count ? Math.ceil(count / pageSize) : 1);
    } catch (error) {
      console.error('Failed to fetch warehouse stock', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  return (
    <EntityListPage
      title="Sisa Stok Gudang Pusat"
      actions={{}}
      table={(props) => <WarehouseStockTable {...props} loading={loading} />}
      data={data}
      pagination={{ currentPage: page, totalPages }}
      onPageChange={setPage}
    />
  );
};

export default WarehouseStockList;
