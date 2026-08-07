import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomer } from '../hooks/useCustomer';
import CustomerRepository from '../repositories/CustomerRepository';
import CustomerForm from '../components/CustomerForm';
import EntityFormPage from '../../../components/entity/EntityFormPage';

const CustomerFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
      navigate('/customers');
    } catch (err) {
      setError(err.message || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <EntityFormPage
      headerProps={{
        title: isEdit ? 'Edit Customer' : 'Create New Customer',
        description: isEdit ? 'Update warung information and settings' : 'Add a new warung to the system'
      }}
      loading={isEdit && isLoadingData}
      error={error || loadError}
      formComponent={
        (!isEdit || initialData) && (
          <CustomerForm initialData={initialData || {}} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        )
      }
    />
  );
};

export default CustomerFormPage;
