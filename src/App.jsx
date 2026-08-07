import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from "react-router-dom";

// import './App.css'

import Register from "./pages/Register.jsx"
import Login from './pages/Login.jsx'
import Dashboard from "./pages/Dashboard.jsx"
// import Profile from './pages/Profile.jsx';
// import Conversions from './pages/Conversions.jsx';
// import Payouts from './pages/Payouts.jsx';
// import Products from "./pages/Products.jsx"
// import TermsAndConditions from './pages/TermsAndConditions.jsx';

// function ProtectedRoute({ LoggedIn, children }) {
//   return LoggedIn ? children : <Navigate to="/login" replace />;
// }

// function PublicRoute({ LoggedIn, children }) {
//   return LoggedIn ? <Navigate to="/dashboard" replace /> : children;
// }

function App() {
  // const [LoggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem("affiliate_token")));

  // useEffect(() => {
  //   const syncAuthState = () => {
  //     setLoggedIn(Boolean(localStorage.getItem("affiliate_token")));
  //   };

  //   syncAuthState();
  //   window.addEventListener("storage", syncAuthState);

  //   return () => window.removeEventListener("storage", syncAuthState);
  // }, []);

  // const handleAuthSuccess = (token, user) => {
  //   if (token) {
  //     localStorage.setItem("affiliate_token", token);
  //   }

  //   if (user) {
  //     localStorage.setItem("affiliate_user", JSON.stringify(user));
  //   }

  //   setLoggedIn(true);
  // };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicRoute LoggedIn={LoggedIn}>
            <Login onAuthSuccess={handleAuthSuccess} />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute LoggedIn={LoggedIn}>
            <Register onAuthSuccess={handleAuthSuccess} />
          </PublicRoute>
        }
      />

      <Route
        path="/login"
        element={
          <PublicRoute LoggedIn={LoggedIn}>
            <Login onAuthSuccess={handleAuthSuccess} />
          </PublicRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute LoggedIn={LoggedIn}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute LoggedIn={LoggedIn}>
            <Products />
          </ProtectedRoute>
        }
      />

      <Route
        path="/conversions"
        element={
          <ProtectedRoute LoggedIn={LoggedIn}>
            <Conversions />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payouts"
        element={
          <ProtectedRoute LoggedIn={LoggedIn}>
            <Payouts />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute LoggedIn={LoggedIn}>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/terms-and-conditions"
        element={
          <ProtectedRoute LoggedIn={LoggedIn}>
            <TermsAndConditions />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
