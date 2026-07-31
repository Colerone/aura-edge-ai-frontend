import Navbar from './components/Navbar';
import Hero from './components/Hero';
import DetectionSection from './components/DetectionSelection';
import DetectionComparison from './components/DetectionComparison';

function App() {
  return (
    <div>
      <Navbar />
      <Hero />
      <DetectionSection/>
      <DetectionComparison />
    </div>
  );
}

export default App;