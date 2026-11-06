// src/components/ui/buttons/ConfirmButton.jsx
import React, { useState } from 'react';
import Button from './Button';
import Modal from './Modal';

const ConfirmButton = ({
  children,
  onConfirm,
  confirmTitle = 'Подтверждение',
  confirmMessage = 'Вы уверены, что хотите выполнить это действие?',
  confirmButtonText = 'Подтвердить',
  cancelButtonText = 'Отмена',
  variant = 'danger',
  icon,
  disabled = false,
  isLoading = false,
  ...buttonProps
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } finally {
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        icon={icon}
        onClick={() => setIsModalOpen(true)}
        disabled={disabled || isLoading}
        isLoading={isLoading}
        {...buttonProps}
      >
        {children}
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={confirmTitle}
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              {cancelButtonText}
            </Button>
            <Button
              variant={variant}
              onClick={handleConfirm}
            >
              {confirmButtonText}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: '#4a5568', lineHeight: 1.6 }}>{confirmMessage}</p>
      </Modal>
    </>
  );
};

export default ConfirmButton;