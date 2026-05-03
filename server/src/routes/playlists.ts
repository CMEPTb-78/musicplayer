import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const userId = req.user!.sub;
  const lists = await prisma.playlist.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      isStarter: true,
      createdAt: true,
      _count: { select: { tracks: true } },
    },
  });
  res.json(lists);
});

router.get("/:id", async (req, res) => {
  const userId = req.user!.sub;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Некорректный id" });
    return;
  }
  const playlist = await prisma.playlist.findFirst({
    where: { id, userId },
    include: {
      tracks: {
        orderBy: { position: "asc" },
        include: {
          track: {
            include: { artist: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!playlist) {
    res.status(404).json({ error: "Плейлист не найден" });
    return;
  }
  res.json({
    id: playlist.id,
    name: playlist.name,
    isStarter: playlist.isStarter,
    createdAt: playlist.createdAt,
    tracks: playlist.tracks.map((pt) => ({
      position: pt.position,
      id: pt.track.id,
      title: pt.track.title,
      popularity: pt.track.popularity,
      durationSec: pt.track.durationSec,
      audioUrl: `/api/stream/${pt.track.id}`,
      artist: pt.track.artist,
    })),
  });
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректное имя плейлиста" });
    return;
  }
  const p = await prisma.playlist.create({
    data: { name: parsed.data.name, userId: req.user!.sub, isStarter: false },
  });
  res.status(201).json(p);
});

export default router;
