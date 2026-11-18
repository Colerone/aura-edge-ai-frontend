import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      {/* Logo */}
      <NavLink to="/" className="navbar-logo" aria-label="Aura Edge AI home">
        AURA Edge AI
      </NavLink>

      {/* Navigation */}
      <div className="navbar-links">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/about">
          About
        </NavLink>
        <a href="#contact">
          Contact
        </a>
      </div>
    </nav>
  );
}

export default Navbar;
