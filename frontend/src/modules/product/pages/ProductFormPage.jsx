import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductForm from '../components/ProductForm';
import EntityFormPage from '../../../components/entity/EntityFormPage';
import { useProduct } from '../hooks/useProduct';
import { useMasterLookups } from '../hooks/useMasterLookups';

const ProductFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const { 
    product, 
    isLoading: productLoading, 
    error: productError, 
    createProduct, 
    updateProduct 
  } = useProduct(id);
  
  const { 
    lookups, 
    isLoading: lookupsLoading, 
    error: lookupsError 
  } = useMasterLookups();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = (isEditMode && productLoading) || lookupsLoading;
  const error = productError || lookupsError;

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await updateProduct(id, formData);
      } else {
        await createProduct(formData);
      }
      navigate('/products');
    } catch (err) {
      console.error('Failed to save product:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <EntityFormPage
      headerProps={{
        title: isEditMode ? 'Edit Product' : 'Create New Product',
        description: isEditMode 
            ? 'Update the details and configurations of your existing product.' 
            : 'Fill in the details to add a new product to your inventory system.'
      }}
      loading={isLoading}
      error={error}
      formComponent={
        <ProductForm
          initialData={isEditMode ? product : null}
          lookups={lookups}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      }
    />
  );
};

export default ProductFormPage;
