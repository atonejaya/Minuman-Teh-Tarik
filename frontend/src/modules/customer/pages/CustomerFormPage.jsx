import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomer } from '../hooks/useCustomer';
import CustomerRepository from '../repositories/CustomerRepository';
import CustomerForm from '../components/CustomerForm';
import EntityFormPage from '../../../components/entity/EntityFormPage';
import { useToast } from '../../../components/toast/ToastContext';

const CustomerFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = Boolean(id);

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
        await CustomerRepository.create(formData);
      }
      toast.success('Data pelanggan berhasil disimpan');
      navigate('/customers');
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
          />
        );
      }}
      onCancel={handleCancel}
    />
  );
};

export default CustomerFormPage;
