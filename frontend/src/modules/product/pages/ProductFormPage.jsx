import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProduct';
import { useMasterLookupContext } from '../../../contexts/MasterLookupContext';
import ProductForm from '../components/ProductForm';
import EntityFormPage from '../../../components/entity/EntityFormPage';
import { useToast } from '../../../components/toast/ToastContext';

const ProductFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditMode = Boolean(id);

  const { data: initialData, loading: dataLoading, error: loadError, createProduct, updateProduct } = useProduct(id);
  const { lookups, loading: lookupsLoading } = useMasterLookupContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isLoading = (isEditMode && dataLoading) || lookupsLoading;

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (isEditMode) {
        await updateProduct(id, formData);
      } else {
        await createProduct(formData);
      }
      toast.success('Data produk berhasil disimpan');
      navigate('/products');
    } catch (err) {
      setSubmitError(err.message || 'Gagal menyimpan produk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <EntityFormPage
      title={isEditMode ? 'Ubah Produk' : 'Buat Produk Baru'}
      form={({ onCancel }) => {
        if (isLoading) {
          return <p className="empty-hint">Memuat...</p>;
        }
        if (loadError) {
          return <div className="alert-error">{loadError}</div>;
        }
        return (
          <ProductForm
            initialData={isEditMode ? initialData : null}
            lookups={lookups || {}}
            onSubmit={handleSubmit}
            onCancel={onCancel || handleCancel}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        );
      }}
      onCancel={handleCancel}
    />
  );
};

export default ProductFormPage;
