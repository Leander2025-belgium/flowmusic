
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
const serverStatus = document.getElementById("serverStatus");

let songs = [];
let filteredSongs = [];
let currentSong = null;
let currentView = "home";
let shuffle = false;
let repeat = false;
let favorites = new Set(JSON.parse(localStorage.getItem("flowmusic:favorites") || "[]"));

const esc = value => String(value ?? "")
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;")
  .replaceAll('"',"&quot;")
  .replaceAll("'","&#039;");

function formatTime(seconds){
  if(!Number.isFinite(seconds)) return "0:00";
  const m=Math.floor(seconds/60);
  const s=Math.floor(seconds%60).toString().padStart(2,"0");
  return `${m}:${s}`;
}

function key(song){ return song.id || song.url; }
function isFavorite(song){ return favorites.has(key(song)); }

function saveFavorites(){
  localStorage.setItem("flowmusic:favorites",JSON.stringify([...favorites]));
}

function updateFavoriteButton(){
  const on=currentSong && isFavorite(currentSong);
  favoriteBtn.textContent=on?"♥":"♡";
  favoriteBtn.classList.toggle("active",!!on);
}

function toggleFavorite(song){
  if(!song) return;
  const k=key(song);
  favorites.has(k)?favorites.delete(k):favorites.add(k);
  saveFavorites();
  updateFavoriteButton();
  applyFilters();
}

async function loadLibrary(){
  try{
    const response=await fetch("./api/songs",{cache:"no-store"});
    if(!response.ok) throw new Error("Geen API");
    songs=await response.json();
    serverStatus.textContent="Verbonden";
    songCount.textContent=`${songs.length} ${songs.length===1?"nummer":"nummers"}`;
    applyFilters();
  }catch(error){
    songs=[];
    filteredSongs=[];
    serverStatus.textContent="GitHub preview";
    songCount.textContent="0 nummers";
    emptyState.classList.remove("hidden");
  }
}

function applyFilters(){
  const q=searchInput.value.trim().toLowerCase();

  filteredSongs=songs.filter(song=>{
    if(currentView==="favorites" && !isFavorite(song)) return false;
    if(!q) return true;
    return [song.title,song.artist,song.album]
      .filter(Boolean)
      .some(v=>v.toLowerCase().includes(q));
  });

  const sortBy=sortSelect.value;
  filteredSongs.sort((a,b)=>String(a[sortBy]||"").localeCompare(String(b[sortBy]||""),"nl",{sensitivity:"base"}));
  renderSongs();
}

function renderSongs(){
  songList.innerHTML="";
  emptyState.classList.toggle("hidden",filteredSongs.length>0);

  filteredSongs.forEach((song,index)=>{
    const row=document.createElement("div");
    row.className="song-row";
    if(currentSong && key(song)===key(currentSong)) row.classList.add("active");

    row.innerHTML=`
      <div class="row-index">${index+1}</div>
      <div class="song-main">
        <img class="song-thumb" src="${song.cover || "./default-cover.svg"}" alt="">
        <div class="song-text">
          <strong>${esc(song.title || "Onbekende titel")}</strong>
          <span>${esc(song.artist || "Onbekende artiest")}</span>
        </div>
      </div>
      <div class="artist-cell">${esc(song.artist || "—")}</div>
      <div class="album-cell">${esc(song.album || "—")}</div>
      <div class="duration-cell">${song.duration?formatTime(song.duration):""}</div>
      <button class="row-heart ${isFavorite(song)?"on":""}">${isFavorite(song)?"♥":"♡"}</button>
    `;

    row.addEventListener("click",e=>{
      if(e.target.closest(".row-heart")) return;
      playSong(song);
    });

    row.querySelector(".row-heart").addEventListener("click",()=>toggleFavorite(song));
    songList.appendChild(row);
  });
}

function playSong(song){
  if(!song) return;
  currentSong=song;
  audio.src=song.url;
  audio.play().catch(()=>{});
  songTitle.textContent=song.title||"Onbekende titel";
  artist.textContent=song.artist||"Onbekende artiest";
  cover.src=song.cover||"./default-cover.svg";
  playBtn.textContent="⏸";
  updateFavoriteButton();
  renderSongs();

  if("mediaSession" in navigator){
    navigator.mediaSession.metadata=new MediaMetadata({
      title:song.title||"",
      artist:song.artist||"",
      album:song.album||"",
      artwork:[{src:cover.src}]
    });
  }
}

function currentIndex(){
  if(!currentSong) return -1;
  return filteredSongs.findIndex(s=>key(s)===key(currentSong));
}
function playNext(){
  if(!filteredSongs.length) return;
  if(shuffle){
    const pool=filteredSongs.filter(s=>!currentSong || key(s)!==key(currentSong));
    return playSong(pool[Math.floor(Math.random()*pool.length)]||filteredSongs[0]);
  }
  const i=currentIndex();
  playSong(filteredSongs[(i+1+filteredSongs.length)%filteredSongs.length]);
}
function playPrevious(){
  if(!filteredSongs.length) return;
  const i=currentIndex();
  playSong(filteredSongs[(i-1+filteredSongs.length)%filteredSongs.length]);
}

playBtn.addEventListener("click",()=>{
  if(!currentSong && filteredSongs.length) return playSong(filteredSongs[0]);
  if(!currentSong) return;
  if(audio.paused){audio.play();playBtn.textContent="⏸";}
  else{audio.pause();playBtn.textContent="▶";}
});
previousBtn.addEventListener("click",playPrevious);
nextBtn.addEventListener("click",playNext);

shuffleBtn.addEventListener("click",()=>{
  shuffle=!shuffle;
  shuffleBtn.classList.toggle("active",shuffle);
});
repeatBtn.addEventListener("click",()=>{
  repeat=!repeat;
  repeatBtn.classList.toggle("active",repeat);
});
favoriteBtn.addEventListener("click",()=>toggleFavorite(currentSong));

playAllBtn.addEventListener("click",()=>{
  if(filteredSongs.length) playSong(filteredSongs[0]);
});

audio.addEventListener("timeupdate",()=>{
  if(!audio.duration) return;
  progress.value=(audio.currentTime/audio.duration)*100;
  currentTimeEl.textContent=formatTime(audio.currentTime);
  durationEl.textContent=formatTime(audio.duration);
});
audio.addEventListener("loadedmetadata",()=>durationEl.textContent=formatTime(audio.duration));
audio.addEventListener("play",()=>playBtn.textContent="⏸");
audio.addEventListener("pause",()=>playBtn.textContent="▶");
audio.addEventListener("ended",()=>{
  if(repeat && currentSong){audio.currentTime=0;audio.play();}
  else playNext();
});

progress.addEventListener("input",()=>{
  if(audio.duration) audio.currentTime=(Number(progress.value)/100)*audio.duration;
});
volume.addEventListener("input",()=>audio.volume=Number(volume.value));
audio.volume=Number(volume.value);

searchInput.addEventListener("input",applyFilters);
sortSelect.addEventListener("change",applyFilters);

document.querySelectorAll(".nav-item").forEach(button=>{
  button.addEventListener("click",()=>{
    document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));
    button.classList.add("active");
    currentView=button.dataset.view;
    sectionTitle.textContent=currentView==="favorites"?"Favorieten":currentView==="library"?"Bibliotheek":"Alle nummers";
    applyFilters();
  });
});

document.querySelectorAll(".mix-card").forEach(card=>{
  card.addEventListener("click",()=>{
    const target=card.dataset.mix;
    if(target==="favorites"){
      currentView="favorites";
      sectionTitle.textContent="Favorieten";
    }else{
      currentView="library";
      sectionTitle.textContent="Bibliotheek";
    }
    document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===currentView));
    applyFilters();
    document.querySelector(".library-section").scrollIntoView({behavior:"smooth",block:"start"});
  });
});

document.addEventListener("keydown",e=>{
  if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="k"){
    e.preventDefault();
    searchInput.focus();
  }
});

if("mediaSession" in navigator){
  navigator.mediaSession.setActionHandler("play",()=>audio.play());
  navigator.mediaSession.setActionHandler("pause",()=>audio.pause());
  navigator.mediaSession.setActionHandler("previoustrack",playPrevious);
  navigator.mediaSession.setActionHandler("nexttrack",playNext);
}

loadLibrary();
