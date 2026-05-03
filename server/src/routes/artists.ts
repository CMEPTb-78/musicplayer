import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  const artists = await prisma.artist.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { tracks: true } },
    },
  });
  res.json(
    artists.map((a) => ({
      id: a.id,
      name: a.name,
      trackCount: a._count.tracks,
    }))
  );
});

router.get("/:id/tracks", authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Некорректный id" });
    return;
  }
  const artist = await prisma.artist.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!artist) {
    res.status(404).json({ error: "Артист не найден" });
    return;
  }
  const tracks = await prisma.track.findMany({
    where: { artistId: id },
    orderBy: [{ popularity: "desc" }, { id: "asc" }],
    take: 100,
    include: { artist: { select: { id: true, name: true } } },
  });
  res.json({
    id: artist.id,
    name: artist.name,
    tracks: tracks.map((t, position) => ({
      position,
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
