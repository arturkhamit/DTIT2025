import './InputButton.css';

function InputButton({ label, onClick }) {
  return (
    <button className="input-btn" onClick={onClick}>
      {label}
    </button>
  );
}

export default InputButton;