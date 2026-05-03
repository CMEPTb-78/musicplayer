import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import authRoutes from "./routes/auth.js";
import artistsRoutes from "./routes/artists.js";
import discoverRoutes from "./routes/discover.js";
import playlistsRoutes from "./routes/playlists.js";
import streamRoutes from "./routes/stream.js";
import tracksRoutes from "./routes/tracks.js";
import uploadsRoutes from "./routes/uploads.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/artists", artistsRoutes);
app.use("/api/discover", discoverRoutes);
app.use("/api/playlists", playlistsRoutes);
app.use("/api/stream", streamRoutes);
app.use("/api/tracks", tracksRoutes);
app.use("/api/uploads", uploadsRoutes);

const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
app.use("/uploads", express.static(uploadRoot));

app.listen(port, () => {
  console.log(`API http://localhost:${port}`);
});
