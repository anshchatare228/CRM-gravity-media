import { BrowserRouter, Routes, Route } from 'react-router-dom'; 
import Dashboard from './pages/Dashboard'; 
import Clients from "./pages/Clients";
// import Internals from "./pages/Internals";

export default function App() { 
  return ( 
    <BrowserRouter> 
      <Routes> 
        {/* Your main home page now correctly points to Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} /> 
        
        {/* Put the clients route inside the SAME Routes block */}
        <Route path="/clients" element={<Clients />} /> 
        
        {/* <Route path="/internals" element={<Internals />} /> */}
      </Routes> 
    </BrowserRouter> 
  ); 
}
