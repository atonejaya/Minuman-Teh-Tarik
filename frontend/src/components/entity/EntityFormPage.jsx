import React from 'react';

const EntityFormPage = ({ title, form, onSubmit, onCancel, initialData }) => {
  return (
    <div className="entity-form-page">
      <div className="page-header mb-4">
        <h2>{title || 'Form Entitas'}</h2>
      </div>
      
      <div className="form-container card">
        <div className="card-body">
          {form ? (
            form({ initialData, onSubmit, onCancel })
          ) : (
            <p className="text-muted">Komponen form tidak tersedia.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EntityFormPage;
