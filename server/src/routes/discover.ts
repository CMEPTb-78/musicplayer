import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/tracks", async (req, res) => {
  const raw = Number(req.query.limit);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(1, raw), 100) : 40;
  const tracks = await prisma.track.findMany({
    take: limit,
    orderBy: [{ popularity: "desc" }, { id: "asc" }],
    include: { artist: { select: { id: true, name: true } } },
  });
  res.json({
    tracks: tracks.map((t) => ({
      id: t.id,
      title: t.title,
      popularity: t.popularity,
      durationSec: t.durationSec,
      audioUrl: `/api/stream/${t.id}`,
      artist: t.artist,
    })),
  });
});

export default router;
