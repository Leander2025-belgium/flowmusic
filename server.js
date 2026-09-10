const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 4000);
const MUSIC_DIR = path.resolve(process.env.MUSIC_DIR || path.join(__dirname, "music"));
const PUBLIC_DIR = path.join(__dirname, "public");

const AUDIO_EXTENSIONS = new Set([".mp3", ".flac", ".m4a", ".aac", ".ogg", ".wav", ".opus"]);

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(walk(full));
      continue;
    }

    if (AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

function safePathRelative(file) {
  return path.relative(MUSIC_DIR, file).split(path.sep).map(encodeURIComponent).join("/");
}

async function buildSong(file, index) {
  const relative = path.relative(MUSIC_DIR, file);
  const fallbackTitle = path.basename(file, path.extname(file));

  try {
    const metadata = await mm.parseFile(file, { duration: true, skipCovers: true });
    return {
      id: relative.replaceAll("\\\\", "/"),
      title: metadata.common.title || fallbackTitle,
      artist: metadata.common.artist || metadata.common.albumartist || "Onbekende artiest",
      album: metadata.common.album || "Onbekend album",
      duration: metadata.format.duration || 0,
      url: `/music/${safePathRelative(file)}`,
      cover: `/covers/default-cover.svg`
    };
  } catch (error) {
    return {
      id: relative.replaceAll("\\\\", "/"),
      title: fallbackTitle,
      artist: "Onbekende artiest",
      album: "Onbekend album",
      duration: 0,
      url: `/music/${safePathRelative(file)}`,
      cover: `/covers/default-cover.svg`
    };
  }
}

app.use(express.static(PUBLIC_DIR));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    musicDir: MUSIC_DIR,
    exists: fs.existsSync(MUSIC_DIR)
  });
});

app.get("/api/songs", async (req, res) => {
  try {
    const files = walk(MUSIC_DIR);
    const songs = [];

    for (let i = 0; i < files.length; i++) {
      songs.push(await buildSong(files[i], i));
    }

    songs.sort((a, b) => a.title.localeCompare(b.title, "nl", { sensitivity: "base" }));
    res.json(songs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Kon muziekbibliotheek niet lezen." });
  }
});

app.get("/music/*filePath", (req, res) => {
  const requested = req.params.filePath;
  const parts = Array.isArray(requested) ? requested : [requested];
  const decoded = parts.map(decodeURIComponent);
  const absolute = path.resolve(MUSIC_DIR, ...decoded);

  if (!absolute.startsWith(MUSIC_DIR + path.sep) && absolute !== MUSIC_DIR) {
    return res.status(403).send("Verboden pad");
  }

  if (!fs.existsSync(absolute)) {
    return res.status(404).send("Bestand niet gevonden");
  }

  res.sendFile(absolute);
});

app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FlowMusic draait op http://0.0.0.0:${PORT}`);
  console.log(`Muziekmap: ${MUSIC_DIR}`);
});
