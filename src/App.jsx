import Navbar from './components/Navbar';
import Hero from './components/Hero';
import DetectionSection from './components/DetectionSelection';
import DetectionComparison from './components/DetectionComparison';
import Footer from './components/Footer'
import AnalysisPage from './pages/AnalysisPage';

import { BrowserRouter, Routes, Route } from 'react-router-dom';

function HomePage() {
  return (
    <>
      <Navbar />
      <Hero />
      <DetectionSection />
      <DetectionComparison />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/analysis"
          element={<AnalysisPage />}
        />
        
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;