import React, { useEffect, useRef, useState } from 'react';
import './DetectionComparison.css';

import originalImage from '../assets/test_img2.jpg';
import detectedImage from '../assets/detect.jpg';

function DetectionComparison() {
  const sectionRef = useRef(null);
  const comparisonRef = useRef(null);

  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState(50);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.2,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const updateSlider = (clientX) => {
    if (!comparisonRef.current) return;

    const rect = comparisonRef.current.getBoundingClientRect();

    let newPosition =
      ((clientX - rect.left) / rect.width) * 100;

    newPosition = Math.max(0, Math.min(100, newPosition));

    setPosition(newPosition);
  };

  const handleMouseMove = (event) => {
    if (event.buttons === 1) {
      updateSlider(event.clientX);
    }
  };

  const handleTouchMove = (event) => {
    updateSlider(event.touches[0].clientX);
  };

  const handleClick = (event) => {
    updateSlider(event.clientX);
  };

  return (
    <section
      ref={sectionRef}
      className={`comparison-section ${
        isVisible ? 'comparison-visible' : ''
      }`}
    >

      {/* =========================================
          SECTION HEADER
      ========================================= */}

      <div className="comparison-header">

        <h2 className="comparison-title">
          See Sample How Our AI
          <br />
          Detects Your Skin
        </h2>

        

      </div>

      <div
        ref={comparisonRef}
        className="comparison-container"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onTouchMove={handleTouchMove}
      >

        <img
          src={originalImage}
          alt="Original facial image"
          className="comparison-image original-image"
        />



        <div
          className="detected-image-wrapper"
          style={{
            width: `${position}%`,
          }}
        >

          <img
            src={detectedImage}
            alt="AI detected facial skin conditions"
            className="comparison-image detected-image"
          />

        </div>


        <div
          className="comparison-slider"
          style={{
            left: `${position}%`,
          }}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
        >

          <div className="slider-line"></div>

          <div className="slider-button">
            <span>‹</span>
            <span>›</span>
          </div>

        </div>

      </div>

    </section>
  );
}

export default DetectionComparison;