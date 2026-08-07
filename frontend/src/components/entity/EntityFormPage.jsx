import React from 'react';

const EntityFormPage = ({ title, form: FormComponent, onSubmit, onCancel, initialData }) => {
  return (
    <div className="entity-form-page">
      <div className="page-header mb-4">
        <h2>{title || 'Entity Form'}</h2>
      </div>
      
      <div className="form-container card">
        <div className="card-body">
          {FormComponent ? (
            <FormComponent initialData={initialData} onSubmit={onSubmit} onCancel={onCancel} />
          ) : (
            <p className="text-muted">No form component provided.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EntityFormPage;
