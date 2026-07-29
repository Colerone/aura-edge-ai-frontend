import React from 'react';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        Aura Edge<span>.ai</span>
      </div>

      <div className="navbar-right">
        <span className="login-btn">Log in</span>
        <button className="signup-btn">Sign up</button>
      </div>
    </nav>
  );
}

export default Navbar;