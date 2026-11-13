import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

function ProtectedRoute() {
  const { isAuthenticated, hasSpace, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) return <div className="auth-loading" role="status">Opening your shared space…</div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!hasSpace && location.pathname !== "/space/setup") {
    return <Navigate to="/space/setup" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
