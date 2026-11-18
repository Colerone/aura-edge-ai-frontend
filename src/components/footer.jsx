import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer-section" id="contact">
      <div className="footer-container">
        {/* Brand & Description */}
        <div className="footer-brand">
          <h2 className="footer-logo">Aura Edge AI</h2>
          <p className="footer-description">
            AI-assisted facial skin analysis and general skincare guidance,
            bringing visual detection and structured skincare knowledge
            together in one place.
          </p>
        </div>

        {/* Quick Links */}
        <div className="footer-links">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/analysis">Skin Analysis</Link></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>

        {/* Project Information */}
        <div className="footer-links">
          <h3>Project</h3>
          <ul>
            <li><Link to="/about#about-how-it-works">How It Works</Link></li>
            <li><Link to="/about#about-conditions">Supported Conditions</Link></li>
            <li><Link to="/about#about-technology">Technology</Link></li>
            <li><Link to="/about#about-responsible">Responsible AI</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Aura Edge AI. All rights reserved.</p>
        <p className="footer-disclaimer-short">
          AI-assisted information only. Not a medical diagnosis.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
