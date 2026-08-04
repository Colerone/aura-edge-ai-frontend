import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const imageFile = location.state?.imageFile;

  const [originalImage, setOriginalImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!imageFile) {
      setLoading(false);
      return;
    }

    const analyzeImage = async () => {
      try {
        const formData = new FormData();
        formData.append('file', imageFile);

        const response = await fetch(
          'http://127.0.0.1:8000/predict',
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error('Failed to analyze image');
        }

        const data = await response.json();

        setDetections(data.detections);

        setOriginalImage(
          `http://127.0.0.1:8000${data.original_image}`
        );

        setResultImage(
          `http://127.0.0.1:8000${data.result_image}`
        );

      } catch (err) {
        console.error(err);
        setError('Something went wrong while analyzing the image.');
      } finally {
        setLoading(false);
      }
    };

    analyzeImage();
  }, [imageFile]);

  if (!imageFile) {
    return (
      <div>
        <h2>No image selected</h2>

        <button onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h1>Analyzing your skin...</h1>
        <p>Please wait while our AI analyzes the image.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2>{error}</h2>

        <button onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Skin Analysis Result</h1>

      <div>
        <div>
          <h3>Original Image</h3>

          <img
            src={originalImage}
            alt="Original facial image"
            style={{
              width: '100%',
              maxWidth: '500px',
            }}
          />
        </div>

        <div>
          <h3>AI Detection</h3>

          <img
            src={resultImage}
            alt="AI detection result"
            style={{
              width: '100%',
              maxWidth: '500px',
            }}
          />
        </div>
      </div>

      <div>
        <h2>Detection Results</h2>

        {detections.length === 0 ? (
          <p>No skin condition detected.</p>
        ) : (
          detections.map((detection, index) => (
            <div key={index}>
              <p>
                <strong>{detection.class}</strong>
              </p>

              <p>
                Confidence: {(detection.confidence * 100).toFixed(2)}%
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AnalysisPage;