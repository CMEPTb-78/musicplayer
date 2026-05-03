import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import AppShell from "@/layout/AppShell";
import MainLayout from "@/layout/MainLayout";
import ArtistPage from "@/pages/ArtistPage";
import DashboardPage from "@/pages/DashboardPage";
import DiscoverPage from "@/pages/DiscoverPage";
import LoginPage from "@/pages/LoginPage";
import PlaylistPage from "@/pages/PlaylistPage";
import RegisterPage from "@/pages/RegisterPage";
import PrivateOutlet from "@/routing/PrivateOutlet";

export default function App() {
  const { token } = useAuth();
  const { pathname } = useLocation();
  const narrowShell = pathname === "/login" || pathname === "/register";

  return (
    <>
      {narrowShell ? <div className="app-forest-bg" aria-hidden /> : null}
      <div className={`shell${narrowShell ? " shell--narrow shell--app shell--auth" : ""}`}>
        {narrowShell ? (
          <header className="auth-shell-header">
            <div className="auth-shell-brand">Индивидуальные аудиоподборки</div>
            <span className="auth-shell-meta">Курсовой проект · клиент-сервер</span>
          </header>
        ) : null}

        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<PrivateOutlet />}>
            <Route element={<AppShell />}>
              <Route element={<MainLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="playlist/:id" element={<PlaylistPage />} />
                <Route path="discover" element={<DiscoverPage />} />
                <Route path="artist/:artistId" element={<ArtistPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to={token ? "/" : "/login"} replace />} />
        </Routes>
      </div>
    </>
  );
}
