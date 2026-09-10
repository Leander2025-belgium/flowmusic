const audio = document.getElementById("audio");
const songList = document.getElementById("songList");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const playBtn = document.getElementById("playBtn");
const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const favoriteBtn = document.getElementById("favoriteBtn");
const progress = document.getElementById("progress");
const volume = document.getElementById("volume");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const songTitle = document.getElementById("songTitle");
const artist = document.getElementById("artist");
const cover = document.getElementById("cover");
const emptyState = document.getElementById("emptyState");
const songCount = document.getElementById("songCount");
const playAllBtn = document.getElementById("playAllBtn");
const sectionTitle = document.getElementById("sectionTitle");

let songs = [];
let filteredSongs = [];
let currentSong = null;
let shuffle = false;
let repeat = false;
let currentView = "home";
let favorites = new Set(JSON.parse(localStorage.getItem("flowmusic:favorites") || "[]"));

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function saveFavorites() {
  localStorage.setItem("flowmusic:favorites", JSON.stringify([...favorites]));
}

function songKey(song) {
  return song.id || song.url;
}

function isFavorite(song) {
  return favorites.has(songKey(song));
}

function updateFavoriteButton() {
  if (!currentSong) {
    favoriteBtn.textContent = "♡";
    favoriteBtn.classList.remove("active");
    return;
  }
  const on = isFavorite(currentSong);
  favoriteBtn.textContent = on ? "♥" : "♡";
  favoriteBtn.classList.toggle("active", on);
}

function toggleFavorite(song) {
  if (!song) return;
  const key = songKey(song);
  if (favorites.has(key)) favorites.delete(key);
  else favorites.add(key);
  saveFavorites();
  updateFavoriteButton();
  applyFilters();
}

async function loadLibrary() {
  try {
    const response = await fetch("./api/songs");
    if (!response.ok) throw new Error("Kon bibliotheek niet ophalen");
    songs = await response.json();
    songCount.textContent = `${songs.length} ${songs.length === 1 ? "nummer" : "nummers"}`;
    applyFilters();
  } catch (error) {
    console.warn("Geen FlowMusic API gevonden. GitHub Pages toont alleen de interface.", error);
    songs = [];
    songCount.textContent = "0 nummers";
    emptyState.classList.remove("hidden");
    emptyState.querySelector("h3").textContent = "FlowMusic staat klaar";
    emptyState.querySelector("p").textContent = "De interface werkt. Voor muziek vanaf je 320 GB HDD verbind je deze frontend later met de laptopserver.";
  }
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();

  filteredSongs = songs.filter(song => {
    if (currentView === "favorites" && !isFavorite(song)) return false;
    if (!query) return true;
    return [song.title, song.artist, song.album]
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(query));
  });

  const sortBy = sortSelect.value;
  filteredSongs.sort((a, b) =>
    String(a[sortBy] || "").localeCompare(String(b[sortBy] || ""), "nl", { sensitivity: "base" })
  );

  renderSongs();
}

function renderSongs() {
  songList.innerHTML = "";
  emptyState.classList.toggle("hidden", filteredSongs.length !== 0);

  filteredSongs.forEach((song, index) => {
    const row = document.createElement("div");
    row.className = "song-row";
    if (currentSong && songKey(song) === songKey(currentSong)) row.classList.add("active");

    row.innerHTML = `
      <div class="row-index">${index + 1}</div>
      <div class="song-main">
        <img class="song-thumb" src="${song.cover || "./default-cover.svg"}" alt="">
        <div class="song-text">
          <strong>${escapeHtml(song.title || "Onbekende titel")}</strong>
          <span>${escapeHtml(song.artist || "Onbekende artiest")}</span>
        </div>
      </div>
      <div class="artist-cell">${escapeHtml(song.artist || "—")}</div>
      <div class="album-cell">${escapeHtml(song.album || "—")}</div>
      <div class="duration-cell">${song.duration ? formatTime(song.duration) : ""}</div>
      <button class="row-heart ${isFavorite(song) ? "on" : ""}" aria-label="Favoriet">
        ${isFavorite(song) ? "♥" : "♡"}
      </button>
    `;

    row.addEventListener("click", event => {
      if (event.target.closest(".row-heart")) return;
      playSong(song);
    });

    row.querySelector(".row-heart").addEventListener("click", () => toggleFavorite(song));
    songList.appendChild(row);
  });
}

function playSong(song) {
  if (!song) return;
  currentSong = song;
  audio.src = song.url;
  audio.play().catch(console.error);
  songTitle.textContent = song.title || "Onbekende titel";
  artist.textContent = song.artist || "Onbekende artiest";
  cover.src = song.cover || "./default-cover.svg";
  playBtn.textContent = "⏸";
  updateFavoriteButton();
  renderSongs();

  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || "",
      artist: song.artist || "",
      album: song.album || "",
      artwork: [{ src: cover.src }]
    });
  }
}

function getCurrentVisibleIndex() {
  if (!currentSong) return -1;
  return filteredSongs.findIndex(song => songKey(song) === songKey(currentSong));
}

function playNext() {
  if (!filteredSongs.length) return;

  if (shuffle) {
    const choices = filteredSongs.filter(song => !currentSong || songKey(song) !== songKey(currentSong));
    playSong(choices[Math.floor(Math.random() * choices.length)] || filteredSongs[0]);
    return;
  }

  const index = getCurrentVisibleIndex();
  playSong(filteredSongs[(index + 1 + filteredSongs.length) % filteredSongs.length]);
}

function playPrevious() {
  if (!filteredSongs.length) return;
  const index = getCurrentVisibleIndex();
  playSong(filteredSongs[(index - 1 + filteredSongs.length) % filteredSongs.length]);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

playBtn.addEventListener("click", () => {
  if (!currentSong && filteredSongs.length) {
    playSong(filteredSongs[0]);
    return;
  }
  if (!currentSong) return;

  if (audio.paused) {
    audio.play();
    playBtn.textContent = "⏸";
  } else {
    audio.pause();
    playBtn.textContent = "▶";
  }
});

previousBtn.addEventListener("click", playPrevious);
nextBtn.addEventListener("click", playNext);

shuffleBtn.addEventListener("click", () => {
  shuffle = !shuffle;
  shuffleBtn.classList.toggle("active", shuffle);
});

repeatBtn.addEventListener("click", () => {
  repeat = !repeat;
  repeatBtn.classList.toggle("active", repeat);
});

favoriteBtn.addEventListener("click", () => toggleFavorite(currentSong));

playAllBtn.addEventListener("click", () => {
  if (filteredSongs.length) playSong(filteredSongs[0]);
});

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  progress.value = (audio.currentTime / audio.duration) * 100;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener("loadedmetadata", () => {
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener("ended", () => {
  if (repeat && currentSong) {
    audio.currentTime = 0;
    audio.play();
  } else {
    playNext();
  }
});

audio.addEventListener("play", () => playBtn.textContent = "⏸");
audio.addEventListener("pause", () => playBtn.textContent = "▶");

progress.addEventListener("input", () => {
  if (!audio.duration) return;
  audio.currentTime = (Number(progress.value) / 100) * audio.duration;
});

volume.addEventListener("input", () => {
  audio.volume = Number(volume.value);
});

audio.volume = Number(volume.value);

searchInput.addEventListener("input", applyFilters);
sortSelect.addEventListener("change", applyFilters);

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    currentView = button.dataset.view;

    if (currentView === "favorites") sectionTitle.textContent = "Favorieten";
    else if (currentView === "library") sectionTitle.textContent = "Bibliotheek";
    else sectionTitle.textContent = "Alle nummers";

    applyFilters();
  });
});

if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play", () => audio.play());
  navigator.mediaSession.setActionHandler("pause", () => audio.pause());
  navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
  navigator.mediaSession.setActionHandler("nexttrack", playNext);
}

loadLibrary();
