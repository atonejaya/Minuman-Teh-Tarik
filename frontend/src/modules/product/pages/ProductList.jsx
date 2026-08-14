import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductApiService from '../services/ProductApiService';
import ProductTable from '../components/ProductTable';
import ProductFilters from '../components/ProductFilters';
import EntityListPage from '../../../components/entity/EntityListPage';
import { useToast } from '../../../components/toast/ToastContext';

const ProductList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = React.useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const { data: rows, meta } = await ProductApiService.getProducts(params);
      setData(rows);
      setTotalPages(meta?.total ? Math.ceil(meta.total / 20) : 1);
    } catch (err) {
      setError(err.message || 'Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProducts({ ...filters, page });
  }, [filters, page, fetchProducts]);

  const handleToggle = async (row) => {
    try {
      await ProductApiService.setActive(row.id, !row.is_active);
      toast.success(row.is_active ? 'Produk dinonaktifkan' : 'Produk diaktifkan');
      fetchProducts({ ...filters, page });
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui status produk');
    }
  };

  return (
    <EntityListPage
      headerProps={{
        title: "Produk",
        description: "Kelola data master produk dan harga",
        onAdd: () => navigate('/products/new'),
        addButtonLabel: "+ Tambah Produk"
      }}
      error={error}
      filterProps={<ProductFilters filters={filters} setFilters={setFilters} />}
      tableComponent={
        <ProductTable
          data={data}
          loading={loading}
          onView={(row) => navigate(`/products/${row.id}`)}
          onEdit={(row) => navigate(`/products/${row.id}/edit`)}
          onToggle={handleToggle}
        />
      }
      pagination={{ currentPage: page, totalPages }}
      onPageChange={setPage}
    />
  );
};

export default ProductList;
