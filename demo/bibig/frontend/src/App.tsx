import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Recording from './pages/Recording';
import BiographyPage from './pages/Biography';
import BookPreview from './pages/BookPreview';
import Settings from './pages/Settings';
import Archive from './pages/Archive';
import Books from './pages/Books';
import Login from './pages/Login';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/record" element={<Recording />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/books" element={<Books />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/biography/:id" element={<BiographyPage />} />
          <Route path="/book/:id" element={<BookPreview />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
