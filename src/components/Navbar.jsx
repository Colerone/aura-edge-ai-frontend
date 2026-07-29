import React from 'react';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">

      {/* Logo */}
      <div className="navbar-logo">
        Aura Edge<span>.ai</span>
      </div>

      {/* Navigation */}
      <div className="navbar-links">
        <a href="#home" className="active">Home</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </div>

      {/* Right Side */}
      <div className="navbar-right">
        <button className="login-btn">Log in</button>

        <button className="signup-btn">
          Sign up
        </button>
      </div>

    </nav>
  );
}

export default Navbar;