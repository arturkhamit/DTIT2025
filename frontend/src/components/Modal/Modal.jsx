import "./Modal.css";

export default function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;

  return (
    <div className='modal-backdrop' role='dialog' aria-modal='true'>
      <div className='modal-content'>
        <header className='modal-header'>
          <h2>{title}</h2>
          <button className='modal-close-btn' type='button' onClick={onClose}>
            ×
          </button>
        </header>
        <div className='modal-body'>{children}</div>
        {footer && <footer className='modal-footer'>{footer}</footer>}
      </div>
    </div>
  );
}
