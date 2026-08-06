import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DetectionSelection.css";

import skinImage from "../assets/Chemical Peel - Diminish (1)_result.jpg";

function DetectionSection() {
  const sectionRef = useRef(null);
  const navigate = useNavigate();

  const [isVisible, setIsVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    navigate("/analysis", {
    state: {
        file,
    },
  });
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedImage);

      const response = await fetch(
        "http://127.0.0.1:8000/predict",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      navigate("/analysis", {
        state: {
          previewImage: preview,
          result: result,
        },
      });
    } catch (err) {
      console.error(err);
      alert("Something went wrong while analyzing the image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      ref={sectionRef}
      className={`detection-section ${isVisible ? "is-visible" : ""}`}
      id="analysis"
    >
      {/* LEFT */}
      <div className="detection-left">
        <div className="skin-image-wrapper">
          <img
            src={skinImage}
            alt="Facial skin"
            className="skin-image"
          />
        </div>

        <h1 className="upload-description">
          Upload a facial image, we detect skin diseases and recommend suitable
          treatments.
        </h1>
      </div>

      {/* RIGHT */}

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
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="preview-image"
              />
            ) : (
              <div className="upload-placeholder">
                <span className="upload-btn-blue">
                  Upload Image
                </span>

                <p className="drop-text">
                  or drop a file
                </p>

                <small className="file-note">
                  JPG, JPEG or PNG supported
                </small>
              </div>
            )}

            <input
              hidden
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleImageChange}
            />
          </label>

          <div className="sample-images-section">
            <div className="sample-text">
              <strong>No image?</strong>
              <strong>Try one of these:</strong>
            </div>

            <div className="sample-images">
              <img src={skinImage} alt="" />
              <img src={skinImage} alt="" />
              <img src={skinImage} alt="" />
              <img src={skinImage} alt="" />
            </div>
          </div>

          {selectedImage && (
            <button
              className="analyze-button"
              onClick={analyzeImage}
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Analyze Skin"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default DetectionSection;