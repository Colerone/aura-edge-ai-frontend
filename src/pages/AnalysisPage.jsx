  import { useEffect, useState } from "react";
  import { useLocation, useNavigate } from "react-router-dom";
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

    },180);

    analyzeImage();

    return () => clearInterval(timer);

  },[]);

    const analyzeImage = async () => {

      try {

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          "http://127.0.0.1:8000/predict",
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json();
        setProgress(100);

  setTimeout(() => {

      setResult(data);

      setLoading(false);

  },600);

  return;

      } catch (error) {

        console.error(error);

        alert("Analysis failed.");

        navigate("/");

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

            {progress < 30 &&
              "Uploading facial image..."}

            {progress >= 30 &&
              progress < 60 &&
              "Detecting facial skin disease..."}

            {progress >= 60 &&
              progress < 90 &&
              "Analyzing detected regions..."}

            {progress >= 90 &&
              "Generating personalized recommendations..."}

          </p>

          <div className="progress-bar">

            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>

          </div>

        </div>

      </>

    );

  }

    const detections = result.detections || [];

    const diseaseName =
      detections.length > 0
        ? detections[0].class
        : "No Detection";

    const detectionCount = detections.length;

    const highestConfidence =
      detections.length > 0
        ? Math.max(...detections.map(item => item.confidence))
        : 0;

  const getRecommendation = (disease, count, confidence) => {

    switch (disease) {

      case "Acne":

        if (count <= 5) {

          return {

            severity: "Mild",

            ingredients: [
              "Salicylic Acid",
              "Niacinamide"
            ],

            treatment: [
              "Cleanse your face twice daily.",
              "Use a lightweight moisturizer.",
              "Apply SPF 30+ sunscreen every morning."
            ]

          };

        }

        if (count <= 15) {

          return {

            severity: "Moderate",

            ingredients: [
              "Salicylic Acid",
              "Niacinamide",
              "Benzoyl Peroxide"
            ],

            treatment: [
              "Avoid squeezing pimples.",
              "Use an acne treatment every night.",
              "Consult a dermatologist if acne persists."
            ]

          };

        }

        return {

          severity: "Severe",

          ingredients: [
            "Benzoyl Peroxide",
            "Adapalene",
            "Niacinamide"
          ],

          treatment: [
            "Multiple acne lesions detected.",
            "Professional dermatologist consultation is recommended.",
            "Prescription medication may be required."
          ]

        };



      case "Freckles":

        if (count <= 10) {

          return {

            severity: "Light",

            ingredients: [
              "Vitamin C",
              "Niacinamide"
            ],

            treatment: [
              "Wear sunscreen daily.",
              "Avoid prolonged UV exposure."
            ]

          };

        }

        return {

          severity: "Extensive",

          ingredients: [
            "Vitamin C",
            "Tranexamic Acid",
            "Retinol"
          ],

          treatment: [
            "Use SPF50 sunscreen.",
            "Consider professional skin consultation."
          ]

        };



      case "Melasma":

        return {

          severity: count < 5 ? "Mild" : "Moderate",

          ingredients: [
            "Tranexamic Acid",
            "Vitamin C",
            "Niacinamide"
          ],

          treatment: [
            "Avoid direct sunlight.",
            "Use SPF50 every day.",
            "Apply brightening serum."
          ]

        };



      case "Rosacea":

        return {

          severity: count < 5 ? "Mild" : "Moderate",

          ingredients: [
            "Azelaic Acid",
            "Ceramide",
            "Centella Asiatica"
          ],

          treatment: [
            "Avoid spicy food.",
            "Use gentle cleanser.",
            "Keep skin moisturized."
          ]

        };



      default:

        return {

          severity: "Unknown",

          ingredients: [],

          treatment: [
            "No recommendation available."
          ]

        };


    }



  };

  const recommendation = getRecommendation(
    diseaseName,
    detectionCount,
    highestConfidence
);

    return (
      <>
        <Navbar />

        <main className="analysis-page">

          <div className="analysis-container">

            {/* LEFT */}

            <div className="analysis-left">

              <div className="image-card">

                <img
                  src={`http://127.0.0.1:8000${result.result_image}`}
                  alt="Detection"
                  className="detection-image"
                />

              </div>

            </div>

            {/* RIGHT */}

            <div className="analysis-right">

    <div className="report-card">

      <h3 className="fade-item delay1">
        AI Skin Report
      </h3>

      <h2 className="fade-item delay2">
        {diseaseName}
      </h2>

      <p className="fade-item delay3">
        • {detectionCount} detected areas
      </p>

      <p className="fade-item delay4">
        • Confidence {(highestConfidence * 100).toFixed(1)}%
      </p>

      <p className="fade-item delay5">

  • Severity : {recommendation.severity}

</p>

      {recommendation.ingredients.map((item,index)=>(

        <p
          key={index}
          className={`fade-item delay${index+6}`}
        >
          ✓ {item}
        </p>

      ))}

      <p
        className={`fade-item delay${recommendation.ingredients.length+6}`}
      >
        • Treatment Recommendation
      </p>

      {recommendation.treatment.map((item,index)=>(

        <p
          key={index}
          className={`fade-item delay${index+10}`}
        >
          ✓ {item}
        </p>

      ))}

    </div>

    <a
      href={`http://127.0.0.1:8000${result.result_image}`}
      download
      className="download-btn"
    >
      Download Result
    </a>

    <button
      className="download-btn"
      onClick={()=>navigate("/")}
    >
      Analyze Another Image
    </button>

  </div>

          </div>

        </main>
      </>
    );

  }

  export default AnalysisPage;