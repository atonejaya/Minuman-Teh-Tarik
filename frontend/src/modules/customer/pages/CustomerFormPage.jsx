import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useCustomer } from '../hooks/useCustomer';
import CustomerRepository from '../repositories/CustomerRepository';
import CustomerForm from '../components/CustomerForm';
import EntityFormPage from '../../../components/entity/EntityFormPage';
import { useToast } from '../../../components/toast/ToastContext';

const CustomerFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const isSales = user?.role === 'SALES';

  const { data: initialData, loading: isLoadingData, error: loadError } = useCustomer(id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (isEdit) {
        await CustomerRepository.update(id, formData);
      } else {
        const payload = isSales
          ? {
              ...formData,
              assigned_sales_id: user.id,
              area_id: user.area_id,
              created_by: user.id,
              status: 'ACTIVE',
            }
          : formData;
        await CustomerRepository.create(payload);
      }
      toast.success('Data pelanggan berhasil disimpan');
      navigate(isSales ? '/dashboard' : '/customers');
    } catch (err) {
      setError(err.message || 'Gagal menyimpan pelanggan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <EntityFormPage
      title={isEdit ? 'Ubah Pelanggan' : 'Buat Pelanggan Baru'}
      form={({ onCancel }) => {
        if (isEdit && isLoadingData) {
          return <p className="empty-hint">Memuat...</p>;
        }
        if (loadError) {
          return <div className="alert-error">{loadError}</div>;
        }
        return (
          <CustomerForm
            initialData={initialData || {}}
            onSubmit={handleSubmit}
            onCancel={onCancel || handleCancel}
            isSubmitting={isSubmitting}
            submitError={error}
            isSales={isSales}
            salesAreaId={user?.area_id}
            salesName={user?.name}
          />
        );
      }}
      onCancel={handleCancel}
    />
  );
};

export default CustomerFormPage;
