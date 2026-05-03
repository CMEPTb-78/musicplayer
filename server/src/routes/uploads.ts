import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(mp3|mpeg|wav|ogg)$/i.test(file.originalname) || file.mimetype.startsWith("audio/");
    cb(null, ok);
  },
});

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  artistId: z.coerce.number().int().positive(),
  popularity: z.coerce.number().int().min(0).max(100).optional(),
});

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Нужен аудиофайл (поле file)" });
    return;
  }
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    fs.unlink(req.file.path, () => {});
    res.status(400).json({ error: "Некорректные метаданные", details: parsed.error.flatten() });
    return;
  }
  const artist = await prisma.artist.findUnique({ where: { id: parsed.data.artistId } });
  if (!artist) {
    fs.unlink(req.file.path, () => {});
    res.status(400).json({ error: "Артист не найден" });
    return;
  }

  const relative = path.relative(uploadRoot, req.file.path).replace(/\\/g, "/");

  const track = await prisma.track.create({
    data: {
      title: parsed.data.title,
      artistId: parsed.data.artistId,
      popularity: parsed.data.popularity ?? 50,
      durationSec: 0,
      audioPath: relative,
    },
  });

  const userId = req.user!.sub;
  let uploadsPlaylist = await prisma.playlist.findFirst({
    where: { userId, name: "Мои загрузки" },
  });
  if (!uploadsPlaylist) {
    uploadsPlaylist = await prisma.playlist.create({
      data: { userId, name: "Мои загрузки", isStarter: false },
    });
  }
  const maxPos = await prisma.playlistTrack.aggregate({
    where: { playlistId: uploadsPlaylist.id },
    _max: { position: true },
  });
  await prisma.playlistTrack.create({
    data: {
      playlistId: uploadsPlaylist.id,
      trackId: track.id,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  res.status(201).json({
    id: track.id,
    title: track.title,
    artistId: track.artistId,
    audioUrl: `/api/stream/${track.id}`,
  });
});

export default router;
