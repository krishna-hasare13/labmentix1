import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register"; // Import Register
import Dashboard from "./pages/Dashboard";
import SharedPage from "./pages/SharedPage"; // Import Shared Page

function App() {
  // Simple check to protect the dashboard
  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem("token");
    return token ? children : <Navigate to="/" />;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Dashboard is protected - must have token */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* Public Share Route (No Protection) */}
        {/* This allows external users to view files via link */}
        <Route path="/share/:token" element={<SharedPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;