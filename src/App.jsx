
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import DetectionSection from './components/DetectionSelection';
import RealTimeDetection from './components/RealTimeDetection';
import DetectionComparison from './components/DetectionComparison';
import Footer from './components/Footer';
import AnalysisPage from './pages/AnalysisPage';

import { BrowserRouter, Routes, Route } from 'react-router-dom';

function HomePage() {
  return (
    <>
      <Navbar />
      <Hero />

      {/* Existing image upload section */}
      <DetectionSection />

      {/* New real-time camera section */}
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
            <Route path="/analysis" element={<AnalysisPage />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
