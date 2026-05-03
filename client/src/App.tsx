import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import AppShell from "@/layout/AppShell";
import MainLayout from "@/layout/MainLayout";
import ArtistPage from "@/pages/ArtistPage";
import DashboardPage from "@/pages/DashboardPage";
import DiscoverPage from "@/pages/DiscoverPage";
import LoginPage from "@/pages/LoginPage";
import PlaylistPage from "@/pages/PlaylistPage";
import RecentPage from "@/pages/RecentPage";
import RegisterPage from "@/pages/RegisterPage";
import TrackPage from "@/pages/TrackPage";
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
                <Route path="recent" element={<RecentPage />} />
                <Route path="artist/:artistId" element={<ArtistPage />} />
                <Route path="track/:id" element={<TrackPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to={token ? "/" : "/login"} replace />} />
        </Routes>
      </div>
    </>
  );
}
