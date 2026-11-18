import Navbar from './components/Navbar';
import Hero from './components/Hero';
import DetectionSection from './components/DetectionSelection';
import RealTimeDetection from './components/RealTimeDetection';
import DetectionComparison from './components/DetectionComparison';
import Footer from './components/footer';

import AnalysisPage from './pages/AnalysisPage';
import RealTimeAnalysisPage from './pages/RealTimeAnalysisPage';
import AboutPage from './pages/AboutPage';

import { BrowserRouter, Routes, Route } from 'react-router-dom';

function HomePage() {
  return (
    <>
      <Navbar />
      <Hero />

      {/* Image Upload Section */}
      <DetectionSection />

      {/* Real-Time Camera Section */}
      <RealTimeDetection />

      <DetectionComparison />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />

            {/* About page */}
            <Route path="/about" element={<AboutPage />} />

            {/* Image Upload Results */}
            <Route path="/analysis" element={<AnalysisPage />} />

            {/* Real-Time Detection Results */}
            <Route
              path="/realtime-analysis"
              element={<RealTimeAnalysisPage />}
            />
          </Routes>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
