import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

/** Сколько самых популярных треков брать у каждого выбранного артиста */
export const TOP_TRACKS_PER_ARTIST = 3;

export async function registerUserWithStarterPlaylist(input: {
  email: string;
  password: string;
  displayName: string;
  artistIds: number[];
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("EMAIL_TAKEN");
  }

  const artistIds = [...new Set(input.artistIds)];
  if (artistIds.length === 0) {
    throw new Error("NO_ARTISTS");
  }

  const artists = await prisma.artist.findMany({
    where: { id: { in: artistIds } },
    select: { id: true },
  });
  if (artists.length !== artistIds.length) {
    throw new Error("INVALID_ARTISTS");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        displayName: input.displayName,
      },
    });

    await tx.userFavoriteArtist.createMany({
      data: artistIds.map((artistId) => ({ userId: u.id, artistId })),
    });

    const seenTrackIds = new Set<number>();
    const orderedTracks: { trackId: number }[] = [];

    for (const artistId of artistIds) {
      const top = await tx.track.findMany({
        where: { artistId },
        orderBy: { popularity: "desc" },
        take: TOP_TRACKS_PER_ARTIST,
        select: { id: true },
      });
      for (const t of top) {
        if (seenTrackIds.has(t.id)) continue;
        seenTrackIds.add(t.id);
        orderedTracks.push({ trackId: t.id });
      }
    }

    const playlist = await tx.playlist.create({
      data: {
        name: "Стартовая подборка по любимым артистам",
        userId: u.id,
        isStarter: true,
      },
    });

    if (orderedTracks.length > 0) {
      await tx.playlistTrack.createMany({
        data: orderedTracks.map((row, index) => ({
          playlistId: playlist.id,
          trackId: row.trackId,
          position: index,
        })),
      });
    }

    return u;
  });

  return user;
}
