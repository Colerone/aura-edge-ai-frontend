import Navbar from './components/Navbar';
import Hero from './components/Hero';
import DetectionSection from './components/DetectionSelection';
import DetectionComparison from './components/DetectionComparison';
import Footer from './components/Footer';
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
      {/* Footer ကို အောက်ခြေမှာ အမြဲ ကပ်နေစေရန် Flexbox ပုံစံ ဖွဲ့စည်းပေးထားပါသည် */}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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