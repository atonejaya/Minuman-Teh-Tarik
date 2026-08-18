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
      const parStocks = formData._parStocks || [];
      const submitData = { ...formData };
      delete submitData._parStocks;

      if (isEdit) {
        await CustomerRepository.update(id, submitData);
      } else {
        const payload = isSales
          ? {
              ...submitData,
              assigned_sales_id: user.id,
              area_id: user.area_id,
              created_by: user.id,
              status: 'ACTIVE',
            }
          : submitData;
        const newWarung = await CustomerRepository.create(payload);
        if (parStocks.length > 0 && newWarung?.id) {
          const { supabase } = await import('../../../utils/supabase');
          const now = new Date().toISOString();
          const rows = parStocks.map(ps => ({
            warung_id: newWarung.id,
            product_id: ps.product_id,
            par_qty: ps.par_qty,
            min_qty: ps.min_qty || 0,
            max_qty: ps.max_qty || 0,
            is_active: true,
            created_at: now,
            updated_at: now,
          }));
          const { error: parErr } = await supabase.from('OutletParStock').insert(rows);
          if (parErr) {
            console.error('Par stock insert failed:', parErr);
            throw new Error('Warung tersimpan, tapi par stock gagal: ' + parErr.message);
          }
        }
      }
      toast.success('Data warung berhasil disimpan');
      navigate(isSales ? '/dashboard' : '/customers');
    } catch (err) {
      setError(err.message || 'Gagal menyimpan warung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <EntityFormPage
      title={isEdit ? 'Ubah Warung' : 'Tambah Warung'}
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
