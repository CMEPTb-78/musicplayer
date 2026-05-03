import { Outlet } from "react-router-dom";
import { PlayerProvider } from "@/player/PlayerContext";

export default function AppShell() {
  return (
    <PlayerProvider>
      <div className="app-forest-bg" aria-hidden />
      <div className="shell shell--app">
        <Outlet />
      </div>
    </PlayerProvider>
  );
}
