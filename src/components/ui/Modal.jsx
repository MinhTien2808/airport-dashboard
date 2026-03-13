import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '90vh' }}>
                <button onClick={onClose} className="modal-close">
                    <X size={18} />
                </button>
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', flexShrink: 0 }}>
                    <h3 className="card-title" style={{ fontSize: '1.25rem' }}>{title}</h3>
                </div>
                <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', minHeight: 0 }}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
