import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/:id", async (req, res) => {
  const trackId = Number(req.params.id);
  if (!Number.isFinite(trackId)) {
    res.status(400).json({ error: "Некорректный id трека" });
    return;
  }

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      artist: {
        select: { id: true, name: true },
      },
    },
  });

  if (!track) {
    res.status(404).json({ error: "Трек не найден" });
    return;
  }

  res.json({
    id: track.id,
    title: track.title,
    popularity: track.popularity,
    durationSec: track.durationSec,
    audioUrl: `/api/stream/${track.id}`,
    artist: track.artist,
  });
});

export default router;
