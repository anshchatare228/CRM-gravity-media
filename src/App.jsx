import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// Simple example using Tailwind utilities
const Home = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100">
    <h1 className="text-4xl font-bold text-emerald-700 mb-4">Home Page</h1>
    <Link to="/about" className="px-4 py-2 bg-blue-500 text-white rounded-lg">About</Link>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
