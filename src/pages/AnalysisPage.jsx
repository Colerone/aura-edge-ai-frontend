import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";
import Navbar from "../components/Navbar";
import "./AnalysisPage.css";

function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const file = location.state?.file;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!file) {
      navigate("/");
      return;
    }

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(timer);
          return 95;
        }
        return prev + Math.floor(Math.random() * 7);
      });
    }, 180);

    analyzeImage();

    return () => clearInterval(timer);
  }, []);

  const analyzeImage = async () => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setProgress(100);

      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 600);
    } catch (error) {
      console.error(error);
      alert("Analysis failed.");
      navigate("/");
    }
  };

  // 1. PDF Report Download Function
  const handleDownloadPDF = () => {
    const element = document.getElementById("printable-report");
    if (!element) return;

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `Skin_Analysis_Report_${Date.now()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(element).save();
  };

  // 2. Image Download Function
  const handleDownloadImage = async () => {
    if (!result?.result_image) return;

    try {
      const imageUrl = `http://127.0.0.1:8000${result.result_image}`;
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      link.download = `Skin_Analysis_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Cannot download image.");
    }
  };

  const getRecommendation = (disease, count, confidence) => {
    switch (disease) {
      case "Acne":
        if (count <= 5) {
          return {
            severity: "Mild",
            ingredients: ["Salicylic Acid", "Niacinamide"],
            treatment: [
              "Cleanse your face twice daily.",
              "Use a lightweight moisturizer.",
              "Apply SPF 30+ sunscreen every morning.",
            ],
          };
        }
        if (count <= 15) {
          return {
            severity: "Moderate",
            ingredients: ["Salicylic Acid", "Niacinamide", "Benzoyl Peroxide"],
            treatment: [
              "Avoid squeezing pimples.",
              "Use an acne treatment every night.",
              "Consult a dermatologist if acne persists.",
            ],
          };
        }
        return {
          severity: "Severe",
          ingredients: ["Benzoyl Peroxide", "Adapalene", "Niacinamide"],
          treatment: [
            "Multiple acne lesions detected.",
            "Professional dermatologist consultation is recommended.",
            "Prescription medication may be required.",
          ],
        };

      case "Freckles":
        if (count <= 10) {
          return {
            severity: "Light",
            ingredients: ["Vitamin C", "Niacinamide"],
            treatment: ["Wear sunscreen daily.", "Avoid prolonged UV exposure."],
          };
        }
        return {
          severity: "Extensive",
          ingredients: ["Vitamin C", "Tranexamic Acid", "Retinol"],
          treatment: [
            "Use SPF50 sunscreen.",
            "Consider professional skin consultation.",
          ],
        };

      case "Melasma":
        return {
          severity: count < 5 ? "Mild" : "Moderate",
          ingredients: ["Tranexamic Acid", "Vitamin C", "Niacinamide"],
          treatment: [
            "Avoid direct sunlight.",
            "Use SPF50 every day.",
            "Apply brightening serum.",
          ],
        };

      case "Rosacea":
        return {
          severity: count < 5 ? "Mild" : "Moderate",
          ingredients: ["Azelaic Acid", "Ceramide", "Centella Asiatica"],
          treatment: [
            "Avoid spicy food.",
            "Use gentle cleanser.",
            "Keep skin moisturized.",
          ],
        };

      default:
        return {
          severity: "Normal",
          ingredients: ["Gentle Cleanser", "Moisturizer", "Sunscreen"],
          treatment: ["Maintain basic skincare routine daily."],
        };
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="analysis-loading">
          <div className="loader-circle">
            <div className="loader-spinner"></div>
            <span>{progress}%</span>
          </div>
          <h2>Analyzing Your Skin</h2>
          <p>
            {progress < 30 && "Uploading facial image..."}
            {progress >= 30 && progress < 60 && "Detecting facial skin disease..."}
            {progress >= 60 && progress < 90 && "Analyzing detected regions..."}
            {progress >= 90 && "Generating personalized recommendations..."}
          </p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </>
    );
  }

  const detections = result?.detections || [];

  // Group detections by disease class
  const groupedDetections = detections.reduce((acc, item) => {
    if (!acc[item.class]) {
      acc[item.class] = [];
    }
    acc[item.class].push(item);
    return acc;
  }, {});

  const detectedDiseases = Object.keys(groupedDetections).map((disease) => {
    const items = groupedDetections[disease];
    const count = items.length;
    const maxConfidence = Math.max(...items.map((i) => i.confidence));
    return {
      diseaseName: disease,
      count,
      maxConfidence,
      recommendation: getRecommendation(disease, count, maxConfidence),
    };
  });

  return (
    <>
      <Navbar />
      <main className="analysis-page">
        {/* PDF ထွက်သည့်အခါ ဤဧရိယာတစ်ခုလုံး ပါဝင်မည်ဖြစ်သည် */}
        <div className="analysis-container" id="printable-report">
          {/* LEFT */}
          <div className="analysis-left">
            <div className="image-card">
              <img
                src={`http://127.0.0.1:8000${result?.result_image}`}
                alt="Detection"
                className="detection-image"
                crossOrigin="anonymous"
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="analysis-right">
            <div className="report-card">
              <h3 className="report-header">Aura Edge AI Report</h3>

              {detectedDiseases.length === 0 ? (
                <div className="disease-block">
                  
                  <p className="status-text">No skin disease detected.</p>
                </div>
              ) : (
                detectedDiseases.map((item, index) => (
                  <div key={index} className="disease-block">
                    <div className="disease-header">
                      <h2 className="disease-title">{item.diseaseName}</h2>
                      <span
                        className={`severity-badge ${item.recommendation.severity.toLowerCase()}`}
                      >
                        {item.recommendation.severity}
                      </span>
                    </div>

                    <div className="stats-row">
                      <p>
                        <strong>Detected Areas:</strong> <span>{item.count}</span>
                      </p>
                    
                    </div>

                    <h4 className="section-title">Recommended Ingredients</h4>
                    {item.recommendation.ingredients.map((ing, idx) => (
                      <p key={idx} className="list-item">
                        ✓ {ing}
                      </p>
                    ))}

                    <h4 className="section-title">Treatment Recommendation</h4>
                    {item.recommendation.treatment.map((treat, idx) => (
                      <p key={idx} className="list-item">
                        ✓ {treat}
                      </p>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="action-buttons">
              <button className="download-btn" onClick={handleDownloadPDF}>
                📄 Download PDF Report
              </button>

              <button className="download-btn secondary" onClick={handleDownloadImage}>
                🖼️ Download Image Only
              </button>

              <button className="download-btn secondary" onClick={() => navigate("/")}>
                Analyze Another Image
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default AnalysisPage;