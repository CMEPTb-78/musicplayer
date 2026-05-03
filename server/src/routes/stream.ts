import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma.js";
import { streamAuthMiddleware } from "../middleware/streamAuth.js";

const router = Router();

router.use(streamAuthMiddleware);

function resolveAudioPath(stored: string): string | null {
  if (stored.startsWith("http://") || stored.startsWith("https://")) {
    return null;
  }
  const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
  const full = path.resolve(uploadRoot, stored.replace(/^[/\\]+/, ""));
  if (!full.startsWith(uploadRoot)) return null;
  return full;
}

router.get("/:trackId", async (req, res) => {
  const trackId = Number(req.params.trackId);
  if (!Number.isFinite(trackId)) {
    res.status(400).end();
    return;
  }

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      playlists: {
        where: { playlist: { userId: req.user!.sub } },
        take: 1,
      },
    },
  });

  if (!track || track.playlists.length === 0) {
    res.status(404).json({ error: "Трек недоступен" });
    return;
  }

  if (track.audioPath.startsWith("http://") || track.audioPath.startsWith("https://")) {
    res.redirect(track.audioPath);
    return;
  }

  const full = resolveAudioPath(track.audioPath);
  if (!full || !fs.existsSync(full)) {
    res.status(404).json({ error: "Файл не найден на сервере" });
    return;
  }

  const stat = fs.statSync(full);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(full, { start, end });
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "audio/mpeg",
    });
    stream.pipe(res);
    return;
  }

  res.writeHead(200, {
    "Content-Length": stat.size,
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
  });
  fs.createReadStream(full).pipe(res);
});

export default router;
