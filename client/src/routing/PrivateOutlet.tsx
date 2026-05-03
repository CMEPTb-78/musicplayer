import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export default function PrivateOutlet() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
