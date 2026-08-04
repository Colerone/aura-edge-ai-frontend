import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DetectionSelection.css';

import skinImage from '../assets/Chemical Peel - Diminish (1)_result.jpg';

function DetectionSection() {
  const sectionRef = useRef(null);
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.18,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  /* IMAGE UPLOAD */
const handleImageChange = (event) => {
  const file = event.target.files[0];

  if (file) {
    navigate('/analysis', {
      state: {
        imageFile: file,
      },
    });
  }
};

  return (
    <section
      ref={sectionRef}
      className={`detection-section ${isVisible ? 'is-visible' : ''}`}
      id="analysis"
    >
      {/* LEFT SIDE */}
      <div className="detection-left">
        {/* Skin Image */}
        <div className="skin-image-wrapper">
          <img
            src={skinImage}
            alt="Facial skin analysis"
            className="skin-image"
          />
        </div>

        {/* Short Description */}
        <h1 className="upload-description">
          Upload a facial image, we detect image and recommend your skin
        </h1>

      </div>

      <div className="detection-right">

        <div className="upload-content">
           <h1 className="upload-description">
          What kind of facial diseases can we detect?
        </h1>
          <div className="detection-types">
          <span>Acne</span>
          <i></i>
          <span>Melasma</span>
          <i></i>
          <span>Rosacea</span>
          <i></i>
          <span>Freckle</span>
        </div>

          <label className="upload-box">

            {selectedImage ? (
              <img
                src={selectedImage}
                alt="Selected facial image"
                className="preview-image"
              />
            ) : (
              <div className="upload-placeholder">
                <span className="upload-btn-blue">
                  Upload Image
                </span>

                <p className="drop-text">
                  or drop a file,
                </p>

                <small className="file-note">
                  JPG, JPEG or PNG supported
                </small>
              </div>
            )}

            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleImageChange}
              hidden
            />

          </label>


          {/* ဒီနေရာမှာ ထည့်တာ */}
          <div className="sample-images-section">

            <div className="sample-text">
              <strong>No image?</strong>
              <strong>Try one of these:</strong>
            </div>

            <div className="sample-images">
              <img src={skinImage} alt="Sample skin" />
              <img src={skinImage} alt="Sample skin" />
              <img src={skinImage} alt="Sample skin" />
              <img src={skinImage} alt="Sample skin" />
            </div>

          </div>


          {/* Analyze Button */}
          {selectedImage && (
            <button className="analyze-button" type="button">
              Analyze Skin
              <span>→</span>
            </button>
          )}

        </div>

      </div>
    </section>
  );
}

export default DetectionSection;