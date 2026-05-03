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

const addTrackSchema = z.object({
  trackId: z.number().int().positive(),
});

router.post("/:id/tracks", async (req, res) => {
  const userId = req.user!.sub;
  const playlistId = Number(req.params.id);
  const parsed = addTrackSchema.safeParse(req.body);

  if (!Number.isFinite(playlistId)) {
    res.status(400).json({ error: "Некорректный id плейлиста" });
    return;
  }

  if (!parsed.success) {
    res.status(400).json({ error: "Некорректный id трека" });
    return;
  }

  // Check if playlist belongs to user
  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, userId },
  });

  if (!playlist) {
    res.status(404).json({ error: "Плейлист не найден" });
    return;
  }

  // Check if track exists
  const track = await prisma.track.findUnique({
    where: { id: parsed.data.trackId },
  });

  if (!track) {
    res.status(404).json({ error: "Трек не найден" });
    return;
  }

  // Check if track already in playlist
  const existingTrack = await prisma.playlistTrack.findFirst({
    where: { playlistId, trackId: parsed.data.trackId },
  });

  if (existingTrack) {
    res.status(409).json({ error: "Трек уже в плейлисте" });
    return;
  }

  // Get next position
  const maxPosition = await prisma.playlistTrack.findFirst({
    where: { playlistId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const nextPosition = (maxPosition?.position ?? 0) + 1;

  // Add track to playlist
  const playlistTrack = await prisma.playlistTrack.create({
    data: {
      playlistId,
      trackId: parsed.data.trackId,
      position: nextPosition,
    },
  });

  res.status(201).json({ success: true, position: playlistTrack.position });
});

const deleteTrackSchema = z.object({
  trackId: z.number().int().positive(),
});

router.delete("/:id/tracks/:trackId", async (req, res) => {
  const userId = req.user!.sub;
  const playlistId = Number(req.params.id);
  const trackId = Number(req.params.trackId);
  
  if (!Number.isFinite(playlistId)) {
    res.status(400).json({ error: "Некорректный id плейлиста" });
    return;
  }
  
  if (!Number.isFinite(trackId)) {
    res.status(400).json({ error: "Некорректный id трека" });
    return;
  }

  // Check if playlist belongs to user
  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, userId },
  });
  
  if (!playlist) {
    res.status(404).json({ error: "Плейлист не найден" });
    return;
  }

  // Check if track exists in playlist
  const playlistTrack = await prisma.playlistTrack.findFirst({
    where: { playlistId, trackId },
  });
  
  if (!playlistTrack) {
    res.status(404).json({ error: "Трек не найден в плейлисте" });
    return;
  }

  // Delete the track from playlist
  await prisma.playlistTrack.delete({
    where: { id: playlistTrack.id },
  });

  // Reorder remaining tracks
  const remainingTracks = await prisma.playlistTrack.findMany({
    where: { playlistId },
    orderBy: { position: "asc" },
  });

  // Update positions to be sequential
  await prisma.$transaction(
    remainingTracks.map((track, index) =>
      prisma.playlistTrack.update({
        where: { id: track.id },
        data: { position: index + 1 },
      })
    )
  );

  res.status(200).json({ success: true });
});

// Delete playlist
router.delete("/:id", async (req, res) => {
  const userId = req.user!.sub;
  const id = Number(req.params.id);
  
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Некорректный id" });
    return;
  }

  try {
    // Check if playlist exists and belongs to user
    const playlist = await prisma.playlist.findFirst({
      where: { id, userId },
    });

    if (!playlist) {
      res.status(404).json({ error: "Плейлист не найден" });
      return;
    }

    // Don't allow deletion of starter playlists
    if (playlist.isStarter) {
      res.status(403).json({ error: "Нельзя удалить стартовый плейлист" });
      return;
    }

    // Delete the playlist (tracks will be deleted due to cascade)
    await prisma.playlist.delete({
      where: { id },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    res.status(500).json({ error: "Ошибка при удалении плейлиста" });
  }
});

export default router;
