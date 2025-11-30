import './BurgerMenu.css';

function BurgerMenu({ onClick, isOpen }) {
  return (
    <div className={`burger-menu ${isOpen ? "open" : ""}`} onClick={onClick}>
      <div className="bar"></div>
      <div className="bar"></div>
      <div className="bar"></div>
    </div>
  );
}

export default BurgerMenu;