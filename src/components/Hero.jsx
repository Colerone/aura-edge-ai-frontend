import React from 'react';
import './Hero.css';
import modelImg from '../assets/download__1_-removebg-preview_result.png';

function Hero() {
  return (
    <div className="hero-wrapper">
      <div className="hero-container">

        {/* Main Hero Section */}
        <div className="hero-body">

          {/* Left Content */}
          <div className="hero-content">

            {/* Small Badge */}
            <div className="hero-badge animate-fade-in">
              <span>✦</span>
              Aura Edge AI-POWERED
            </div>

            {/* Main Headline */}
            <h1 className="main-headline animate-fade-in">
              Facial Skin Disease
              <br />
              <span>Detection & Recommendation System</span>
            </h1>

            {/* Description */}
            <p className="hero-description animate-fade-in">
              Analyze your facial skin with AI, detect common skin
              conditions, and receive personalized recommendations.
            </p>

            {/* CTA Button */}
            <button className="hero-cta animate-fade-in">
              Start Skin Analysis
              <span>→</span>
            </button>

          </div>

          {/* Model Image */}
          <img
            src={modelImg}
            alt="AI Facial Skin Analysis"
            className="model-image animate-slide-up"
          />

          {/* AI Information Card */}
          <div className="floating-card animate-card-pop">

            <div className="card-icon">
              ✦
            </div>

            <div className="card-details">
              <span className="card-label">
                
              </span>

              <h3>
                Detect & Understand
              </h3>

              <p>
                Deep learning powered facial skin detection.
              </p>
            </div>

          </div>

        {/* Right Side AI Insights */}
<div className="ai-insights animate-insights">

  <div className="insights-heading">
    <span>✦</span>
    <p>AI-POWERED SKIN INSIGHTS</p>
  </div>

  <h2>
    From Detection
    <br />
    to Recommendation.
  </h2>

  <p className="insights-description">
    Turn a facial image into meaningful skin insights
    with intelligent deep learning analysis.
  </p>

  <div className="insight-list">

    <div className="insight-item">
      <div className="insight-number">01</div>
      <div>
        <h3>Detect</h3>
        <p>Identify visible facial skin conditions.</p>
      </div>
    </div>

    <div className="insight-item">
      <div className="insight-number">02</div>
      <div>
        <h3>Analyze</h3>
        <p>Understand the detected skin condition.</p>
      </div>
    </div>

    <div className="insight-item">
      <div className="insight-number">03</div>
      <div>
        <h3>Recommend</h3>
        <p>Receive personalized skincare guidance.</p>
      </div>
    </div>

  </div>

</div>

        </div>
      </div>
    </div>
  );
}

export default Hero;