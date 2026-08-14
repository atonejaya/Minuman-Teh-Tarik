import React from 'react';
import ConfirmDialog from './ConfirmDialog';

const DeleteDialog = ({ isOpen, entityName, onConfirm, onCancel }) => {
  return (
    <ConfirmDialog 
      isOpen={isOpen}
      title="Konfirmasi Penghapusan"
      message={`Apakah Anda yakin ingin menghapus ${entityName || 'item'} ini? Tindakan ini tidak dapat dibatalkan.`}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};

export default DeleteDialog;
