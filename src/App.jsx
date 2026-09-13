import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Clients from "./pages/Clients";
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import Internals from './pages/Internals';
import ClientForm from './components/ClientForm';
import ClientDetail from './components/ClientDetail';
// import Internals from "./pages/Internals";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <Clients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/internals"
          element={
            <ProtectedRoute>
              <Internals />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients/new"
          element={
            <ProtectedRoute>
              <ClientForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients/:id/edit"
          element={
            <ProtectedRoute>
              <ClientForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients/:id"
          element={
            <ProtectedRoute>
              <ClientDetail />
            </ProtectedRoute>
          }
        />

        {/* <Route path="/internals" element={<ProtectedRoute><Internals /></ProtectedRoute>} /> */}
      </Routes>
    </BrowserRouter>
  );
}
