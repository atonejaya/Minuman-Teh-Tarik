import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../utils/supabase';
import EntityListPage from '../../../components/entity/EntityListPage';
import { tableCell } from '../../../utils/tableStyles.js';
import TableMessage from '../../../components/shared/TableMessage';

const WarehouseStockTable = ({ data, loading }) => {
  if (loading) {
    return <TableMessage>Memuat data stok...</TableMessage>;
  }

  if (!data || data.length === 0) {
    return <TableMessage>Tidak ada data stok gudang.</TableMessage>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: 'var(--background)' }}>
          <tr>
            <th style={tableCell}>Gudang</th>
            <th style={tableCell}>Kode Produk</th>
            <th style={tableCell}>Nama Produk</th>
            <th style={tableCell}>Kategori</th>
            <th style={tableCell}>Sisa Stok (Tersedia)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={`${item.warehouse_id}-${item.product_id}`}>
              <td style={{ ...tableCell, fontWeight: '500' }}>{item.warehouse?.name || '-'}</td>
              <td style={tableCell}>{item.product?.code || '-'}</td>
              <td style={tableCell}>{item.product?.name || '-'}</td>
              <td style={tableCell}>{item.product?.category?.name || '-'}</td>
              <td style={{ ...tableCell, fontWeight: '600', color: item.qty_available > 0 ? 'var(--success)' : 'var(--danger)' }}>
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
