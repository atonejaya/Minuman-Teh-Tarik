import React from 'react';
import ConfirmDialog from './ConfirmDialog';

const DeleteDialog = ({ isOpen, entityName, onConfirm, onCancel }) => {
  return (
    <ConfirmDialog 
      isOpen={isOpen}
      title="Delete Confirmation"
      message={`Are you sure you want to delete this ${entityName || 'item'}? This action cannot be undone.`}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};

export default DeleteDialog;
