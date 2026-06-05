import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Recording from './pages/Recording';
import BiographyPage from './pages/Biography';
import BookPreview from './pages/BookPreview';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/record" element={<Recording />} />
          <Route path="/biography/:id" element={<BiographyPage />} />
          <Route path="/book/:id" element={<BookPreview />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
