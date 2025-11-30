import "./Header.css";
import { Link } from "react-router-dom";
import { useState, useEffect, use } from "react";
import BurgerMenu from "./BurgerMenu/BurgerMenu";

export default function Header() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBurger, setIsBurger] = useState(false);

  useEffect(() => {
    if (window.innerWidth <= 1100) {
      setIsBurger(true);
    } else {
      setIsBurger(false);
    }
  }, []);

  window.addEventListener("resize", () => {
    if (window.innerWidth <= 1100) {
      setIsBurger(true);
    } else {
      setIsBurger(false);
      setIsMenuOpen(false);
    }
  });

  window.addEventListener("click", (e) => {
    if (
      !e.target.classList.contains("burger-menu") &&
      !e.target.classList.contains("bar")
    ) {
      setIsMenuOpen(false);
    }
  });

  const Corner = () => {
    return (
      <div className='corner-svg'>
        <svg width='30' height='30' viewBox='0 0 30 30'>
          <mask id='cutout'>
            <rect width='30' height='30' fill='white' />
            <circle cx='0' cy='0' r='30' fill='black' />
          </mask>
          <rect
            width='30'
            height='30'
            fill='#8f8f8f27'
            mask='url(#cutout)'
          />
        </svg>
      </div>
    );
  };

  const Links = () => {
    return (
      <>
        <Link to='/about' className='link'>
          About
        </Link>
        <Link to='/calendar' className='link'>
          Calendar
        </Link>
      </>
    );
  };

  return (
    <div className='header-container'>
      <div className='header-wrapper'>
        {isBurger && isMenuOpen ? <Corner /> : null}
        {isBurger && (
          <div className={`nav-links${isMenuOpen ? " open" : ""}`}>
            <Links />
          </div>
        )}
        <div className='header'>
          <div className='logo-wrapper'>
            <div className='logo-circle'></div>
            <Link to='/about' className='logo'>
              Logo
            </Link>
          </div>
          <BurgerMenu
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            isOpen={isMenuOpen}
          />

          {!isBurger && (
            <div className='nav-links'>
              <Links />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
