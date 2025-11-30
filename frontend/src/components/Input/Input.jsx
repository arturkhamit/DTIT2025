import "./Input.css";

function Input({ value, onEnter, onChange, label, className }) {
  return (
    <div className='input-wrapper'>
      <input
        type='text'
        className={className}
        name={className}
        id={className}
        value={value}
        placeholder=' '
        onChange={onChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) onEnter();
        }}
      />
      <label htmlFor={className} className={className + "-label"}>
        {label}
      </label>
    </div>
  );
}

export default Input;
