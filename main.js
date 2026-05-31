const CONFIG = {
  YT_API_KEY: "AIzaSyANrARCZVtVJ5ZrPFWx0fq2ZaT-uokl4n0",
  YT_CHANNEL_ID: "UCMvvfebTYj4GECUbrW6EHdg",
  YT_MAX_RESULTS: 35, // Fetch more to filter out shorts
  MIN_VIDEO_DURATION_SECONDS: 5 * 60,
};

const FALLBACK_EPISODES = [
  {
    id: "P7LK_SoMHkw",
    title: "#108 | Fiesta de la Corchea, Spotify y entradas de fans, Drake rompe récords",
    date: "30 may 2026",
    durationText: "2h 29m",
    thumb: "https://i.ytimg.com/vi/P7LK_SoMHkw/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=P7LK_SoMHkw",
  },
  {
    id: "1ACSeuwNZKI",
    title: "REACCIÓN a \"TOTY\" de La Pantera",
    date: "28 may 2026",
    durationText: "10m 14s",
    thumb: "https://i.ytimg.com/vi/1ACSeuwNZKI/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=1ACSeuwNZKI",
  },
  {
    id: "Z7cz3LCXcFo",
    title: "REACCIÓN a \"BELLADONNA\" de Xiyo Y Fernandezz",
    date: "22 may 2026",
    durationText: "49m 30s",
    thumb: "https://i.ytimg.com/vi/Z7cz3LCXcFo/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=Z7cz3LCXcFo",
  },
  {
    id: "EjVwm6qWMXA",
    title: "SECH: “La canción que me cambió la vida”",
    date: "19 may 2026",
    durationText: "43m 46s",
    thumb: "https://i.ytimg.com/vi/EjVwm6qWMXA/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=EjVwm6qWMXA",
  },
  {
    id: "chEOqTQj_oc",
    title: "#107 | C. Tangana le tira a J Balvin, Bad Bunny x Zara y anuncio importante",
    date: "15 may 2026",
    durationText: "2h 48m",
    thumb: "https://i.ytimg.com/vi/chEOqTQj_oc/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=chEOqTQj_oc",
  },
  {
    id: "QefDqSNGPm4",
    title: "APRENDEMOS A BAILAR SALSA PARA VER A BAD BUNNY",
    date: "12 may 2026",
    durationText: "24m 39s",
    thumb: "https://i.ytimg.com/vi/QefDqSNGPm4/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=QefDqSNGPm4",
  },
  {
    id: "X1io7mgYHlQ",
    title: "QUEVEDO DESCARTÓ MÁS DE 70 CANCIONES PARA “EL BAIFO”",
    date: "5 may 2026",
    durationText: "7m 8s",
    thumb: "https://i.ytimg.com/vi/X1io7mgYHlQ/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=X1io7mgYHlQ",
  },
  {
    id: "20HY5mmlKKs",
    title: "#106 | Duki con problemas legales, Jay Wheeler acusado de plagio...",
    date: "1 may 2026",
    durationText: "2h 48m",
    thumb: "https://i.ytimg.com/vi/20HY5mmlKKs/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=20HY5mmlKKs",
  }
];

const formatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

document.addEventListener("DOMContentLoaded", () => {
  renderFallback();
  hydrateFromYoutube();
  initFloatingLogos();
  initMobileMenu();
  initDraggableStickers();
});

async function hydrateFromYoutube() {
  try {
    const channel = await fetchChannel();
    if (channel) {
      updateChannelStats(channel);
    }

    const playlistItems = await fetchLatestPlaylistItems();
    if (playlistItems.length) {
      const videoIds = playlistItems.map(item => item.id);
      const durationsMap = await fetchVideoDurations(videoIds);
      
      const validEpisodes = playlistItems
        .map(item => {
          const durationStr = durationsMap[item.id] || "PT0S";
          return {
            ...item,
            durationStr: durationStr,
            durationSec: parseISO8601Duration(durationStr),
            durationText: formatDuration(durationStr)
          };
        })
        .filter(episode => episode.durationSec > CONFIG.MIN_VIDEO_DURATION_SECONDS);

      // Take first 8 episodes
      const episodesToRender = validEpisodes.slice(0, 8);

      if (episodesToRender.length) {
        renderEpisodes(episodesToRender);
        updateHero(episodesToRender[0]);
      }
    }
  } catch (error) {
    console.warn("No se pudo cargar YouTube, usando contenido local.", error);
    renderFallback();
  }
}

async function fetchChannel() {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.search = new URLSearchParams({
    id: CONFIG.YT_CHANNEL_ID,
    part: "snippet,statistics",
    key: CONFIG.YT_API_KEY,
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error("YouTube channel request failed");
  const data = await response.json();
  return data.items?.[0] ?? null;
}

async function fetchLatestPlaylistItems() {
  const uploadsId = `UU${CONFIG.YT_CHANNEL_ID.slice(2)}`;
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.search = new URLSearchParams({
    playlistId: uploadsId,
    part: "snippet,contentDetails",
    maxResults: String(CONFIG.YT_MAX_RESULTS),
    key: CONFIG.YT_API_KEY,
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error("YouTube playlist request failed");
  const data = await response.json();

  return (data.items ?? [])
    .filter((item) => item.snippet?.title && item.contentDetails?.videoId)
    .map((item) => {
      const videoId = item.contentDetails.videoId;
      const thumbs = item.snippet.thumbnails ?? {};
      return {
        id: videoId,
        title: cleanTitle(item.snippet.title),
        date: formatter.format(new Date(item.contentDetails.videoPublishedAt ?? item.snippet.publishedAt)),
        thumb: thumbs.maxres?.url || thumbs.standard?.url || thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    });
}

async function fetchVideoDurations(videoIds) {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.search = new URLSearchParams({
    id: videoIds.join(","),
    part: "contentDetails",
    key: CONFIG.YT_API_KEY,
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error("YouTube videos request failed");
  const data = await response.json();
  
  const durations = {};
  for (const video of (data.items ?? [])) {
    durations[video.id] = video.contentDetails?.duration || "";
  }
  return durations;
}

function parseISO8601Duration(durationString) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationString.match(regex);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || 0, 10);
  const minutes = parseInt(matches[2] || 0, 10);
  const seconds = parseInt(matches[3] || 0, 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(durationStr) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationStr.match(regex);
  if (!matches) return "";
  const h = matches[1] ? parseInt(matches[1], 10) : 0;
  const m = matches[2] ? parseInt(matches[2], 10) : 0;
  const s = matches[3] ? parseInt(matches[3], 10) : 0;
  
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

function updateChannelStats(channel) {
  const subscriberCount = Number(channel.statistics?.subscriberCount ?? 0);
  const avatar = channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.medium?.url;

  if (subscriberCount) {
    document.querySelector("#subscriber-count").textContent = compact(subscriberCount);
  }

  if (avatar && !document.querySelector("#hero-thumb").getAttribute("src")) {
    document.querySelector("#hero-thumb").src = avatar;
    document.querySelector("#hero-thumb").alt = channel.snippet?.title ?? "El Club de la Corchea";
  }
}

function renderFallback() {
  renderEpisodes(FALLBACK_EPISODES);
  updateHero(FALLBACK_EPISODES[0]);
}

function renderEpisodes(episodes) {
  const grid = document.querySelector("#episodes-grid");
  grid.innerHTML = episodes.map(renderEpisodeCard).join("");
}

function renderEpisodeCard(episode) {
  return `
    <a class="episode-card" href="${episode.url}" target="_blank" rel="noopener">
      <div class="episode-media-wrapper">
        <img src="${episode.thumb}" alt="${escapeHtml(episode.title)}" loading="lazy">
        <span class="episode-duration">${episode.durationText || "Episodio"}</span>
        <div class="episode-play-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      <div class="episode-body">
        <h3>${escapeHtml(episode.title)}</h3>
        <div class="episode-meta">
          <span class="episode-tag">Episodio</span>
          <span class="episode-date">${escapeHtml(episode.date)}</span>
        </div>
      </div>
    </a>
  `;
}

function updateHero(episode) {
  const heroThumb = document.querySelector("#hero-thumb");
  const latestTitle = document.querySelector("#latest-title");
  const latestLink = document.querySelector("#latest-episode-link");

  if (heroThumb) {
    heroThumb.src = episode.thumb;
    heroThumb.alt = episode.title;
  }
  if (latestTitle) {
    latestTitle.textContent = episode.title;
  }
  if (latestLink) {
    latestLink.href = episode.url;
  }
}

function cleanTitle(title) {
  return title
    .replace(/\s*\|\s*El Club de la Corchea\s*/gi, "")
    .replace(/\s*\|\s*EL CLUB DE LA CORCHEA\s*/gi, "")
    .replace(/\s*🔵\s*/g, "")
    .trim();
}

function compact(value) {
  return new Intl.NumberFormat("es-ES", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initFloatingLogos() {
  const container = document.createElement("div");
  container.className = "floating-logos-container";
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.pointerEvents = "none";
  container.style.zIndex = "-1";
  container.style.overflow = "hidden";
  document.body.appendChild(container);

  // Logo sources: alternate between mascot and Voll-Damm logo
  const logoImages = [
    "assets/corchea-mascota.jpg",
    "assets/voldam-logo.png"
  ];

  const totalLogos = 12;
  for (let i = 0; i < totalLogos; i++) {
    const logo = document.createElement("div");
    logo.className = "floating-logo-item";
    
    // Choose logo source and render as image watermark
    const imgSrc = logoImages[i % logoImages.length];
    logo.innerHTML = `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; filter: grayscale(1) brightness(0.4) opacity(0.06); pointer-events: none;" />`;
    
    // Position and style
    logo.style.position = "absolute";
    logo.style.left = `${Math.random() * 90 + 5}%`;
    const size = Math.random() * 16 + 24; // 24px to 40px
    logo.style.width = `${size}px`;
    logo.style.height = `${size}px`;
    logo.style.pointerEvents = "none";
    
    // Animation properties
    const duration = Math.random() * 15 + 15; // 15s to 30s for a smooth, relaxed float
    const delay = Math.random() * -30; // Start immediately with offset
    logo.style.animation = `float-up ${duration}s infinite linear`;
    logo.style.animationDelay = `${delay}s`;
    
    container.appendChild(logo);
  }
}

// Preloader fade-out control
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add("preloader-fade-out");
      setTimeout(() => {
        preloader.remove();
      }, 500); // Remove from DOM after CSS opacity transition (0.5s)
    }, 1500); // 1.5 seconds minimum show time
  }
});

function initMobileMenu() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("top-nav");

  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = toggle.classList.toggle("open");
    nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Close menu when clicking navigation links
  nav.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      toggle.classList.remove("open");
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

const activeStickers = [];

function initDraggableStickers() {
  const stickersData = [
    { type: 'text', content: 'bumbum no tan duro', class: 'yellow-sticker', top: '8%', left: '3%' },
    { type: 'image', content: 'assets/corchea-mascota.jpg', class: 'round-sticker', top: '16%', left: '82%' },
    { type: 'text', content: '🎤 shure sm7b', class: 'cyan-sticker', top: '23%', left: '5%' },
    { type: 'text', content: '¡corta, corta! ✂️', class: 'pink-sticker', top: '30%', left: '80%' },
    { type: 'text', content: 'supuestamente de música', class: 'yellow-sticker', top: '40%', left: '4%' },
    { type: 'text', content: '🎧 cascos dj', class: 'pink-sticker', top: '48%', left: '84%' },
    { type: 'text', content: 'esto es beef 🥩', class: 'cyan-sticker', top: '56%', left: '6%' },
    { type: 'image', content: 'assets/voldam-logo.png', class: 'round-sticker', top: '64%', left: '85%' },
    { type: 'text', content: '🍺 voll-damm', class: 'pink-sticker', top: '72%', left: '4%' },
    { type: 'text', content: '🎛️ mesa de mezclas', class: 'pink-sticker', top: '80%', left: '82%' },
    { type: 'text', content: 'sabor del berreo 🦁', class: 'cyan-sticker', top: '87%', left: '8%' },
    { type: 'text', content: '¡a berrear! 📢', class: 'yellow-sticker', top: '93%', left: '80%' }
  ];

  stickersData.forEach((data, index) => {
    const sticker = document.createElement("div");
    sticker.className = `draggable-sticker ${data.class || ''}`;
    
    // Set content
    if (data.type === 'text') {
      sticker.textContent = data.content;
    } else if (data.type === 'image') {
      const img = document.createElement("img");
      img.src = data.content;
      img.alt = "sticker";
      img.style.pointerEvents = "none"; // Make sure image doesn't intercept drag events
      sticker.appendChild(img);
    }

    // Random rotation between -12 and 12 degrees
    const rot = Math.floor(Math.random() * 24 - 12);
    sticker.style.setProperty('--sticker-rot', `${rot}deg`);

    // Absolute position
    sticker.style.top = data.top;
    sticker.style.left = data.left;

    document.body.appendChild(sticker);
    
    // Track sticker state for drifting physics
    activeStickers.push({
      element: sticker,
      x: 0,
      y: 0,
      vx: (Math.random() - 0.5) * 0.4, // Extremely slow drift velocity
      vy: (Math.random() - 0.5) * 0.4,
      isDragging: false,
      width: 0,
      height: 0
    });

    makeDraggable(sticker);
  });

  // Initialize dimensions and start physics loop after rendering
  setTimeout(() => {
    recalcAndClampStickers();
    requestAnimationFrame(updateStickersPhysics);
  }, 200);

  // Recalculate dimensions on window resize to ensure correct boundary physics
  window.addEventListener("resize", recalcAndClampStickers);

  // Recalculate and clamp on window load (once fonts and images are fully ready)
  window.addEventListener("load", recalcAndClampStickers);
}

function recalcAndClampStickers() {
  const wWidth = document.documentElement.clientWidth;
  const wHeight = Math.max(document.body.scrollHeight, window.innerHeight);

  activeStickers.forEach(s => {
    s.width = s.element.offsetWidth;
    s.height = s.element.offsetHeight;
    
    let currentX = s.x || s.element.offsetLeft;
    let currentY = s.y || s.element.offsetTop;

    // Clamp coordinates to keep them inside the window boundaries
    s.x = Math.max(0, Math.min(wWidth - s.width, currentX));
    s.y = Math.max(0, Math.min(wHeight - s.height, currentY));

    if (!s.isDragging) {
      s.element.style.left = `${s.x}px`;
      s.element.style.top = `${s.y}px`;
    }
  });
}

function updateStickersPhysics() {
  const wWidth = document.documentElement.clientWidth;
  const wHeight = Math.max(document.body.scrollHeight, window.innerHeight);

  activeStickers.forEach(s => {
    if (s.isDragging) {
      // Sync internal coordinates with drag positions
      s.x = s.element.offsetLeft;
      s.y = s.element.offsetTop;
      return;
    }

    // Apply friction to high velocity throws to slow down to gentle cruising speed
    const speed = Math.hypot(s.vx, s.vy);
    const targetSpeed = 0.3; // Cruising speed
    if (speed > targetSpeed) {
      const friction = 0.985; // decelerate by 1.5% per frame
      s.vx *= friction;
      s.vy *= friction;
    } else if (speed < 0.1) {
      // Give it a slow kickstart if it slows down to a crawl
      s.vx = (Math.random() - 0.5) * 0.4;
      s.vy = (Math.random() - 0.5) * 0.4;
    }

    // Drift position
    s.x += s.vx;
    s.y += s.vy;

    // Bounce off horizontal bounds
    if (s.x <= 0) {
      s.x = 0;
      s.vx = Math.abs(s.vx);
    } else if (s.x >= wWidth - s.width) {
      s.x = wWidth - s.width;
      s.vx = -Math.abs(s.vx);
    }

    // Bounce off vertical bounds
    if (s.y <= 0) {
      s.y = 0;
      s.vy = Math.abs(s.vy);
    } else if (s.y >= wHeight - s.height) {
      s.y = wHeight - s.height;
      s.vy = -Math.abs(s.vy);
    }

    s.element.style.left = `${s.x}px`;
    s.element.style.top = `${s.y}px`;
  });

  requestAnimationFrame(updateStickersPhysics);
}

function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  let dragVx = 0;
  let dragVy = 0;
  let lastMoveTime = 0;
  const stickerState = activeStickers.find(s => s.element === element);

  element.addEventListener("mousedown", dragStart);
  element.addEventListener("touchstart", dragStart, { passive: false });

  function dragStart(e) {
    e = e || window.event;
    
    if (stickerState) {
      stickerState.isDragging = true;
    }

    if (e.type === "touchstart") {
      e.preventDefault();
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
    } else {
      pos3 = e.clientX;
      pos4 = e.clientY;
    }

    dragVx = 0;
    dragVy = 0;
    lastMoveTime = Date.now();

    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("touchend", dragEnd);
    document.addEventListener("mousemove", dragMove);
    document.addEventListener("touchmove", dragMove, { passive: false });
  }

  function dragMove(e) {
    e = e || window.event;
    
    let clientX, clientY;
    if (e.type === "touchmove") {
      e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const vx_instant = clientX - pos3;
    const vy_instant = clientY - pos4;

    pos1 = pos3 - clientX;
    pos2 = pos4 - clientY;
    pos3 = clientX;
    pos4 = clientY;

    lastMoveTime = Date.now();

    // Compute running average of velocity (inertia / throw momentum)
    dragVx = dragVx * 0.7 + vx_instant * 0.3;
    dragVy = dragVy * 0.7 + vy_instant * 0.3;

    // Cap velocity to avoid chaotic teleportations
    const maxVel = 25;
    dragVx = Math.max(-maxVel, Math.min(maxVel, dragVx));
    dragVy = Math.max(-maxVel, Math.min(maxVel, dragVy));

    const wWidth = document.documentElement.clientWidth;
    const wHeight = Math.max(document.body.scrollHeight, window.innerHeight);
    const sWidth = (stickerState && stickerState.width) || element.offsetWidth;
    const sHeight = (stickerState && stickerState.height) || element.offsetHeight;

    let newTop = element.offsetTop - pos2;
    let newLeft = element.offsetLeft - pos1;

    // Clamp coordinates during drag to prevent page overflow/horizontal scroll
    newLeft = Math.max(0, Math.min(wWidth - sWidth, newLeft));
    newTop = Math.max(0, Math.min(wHeight - sHeight, newTop));

    element.style.top = `${newTop}px`;
    element.style.left = `${newLeft}px`;
  }

  function dragEnd() {
    if (stickerState) {
      stickerState.isDragging = false;
      stickerState.width = element.offsetWidth;
      stickerState.height = element.offsetHeight;

      const timeDiff = Date.now() - lastMoveTime;
      if (timeDiff > 80) {
        // Stationary release (held still before release) -> back to slow drift
        stickerState.vx = (Math.random() - 0.5) * 0.4;
        stickerState.vy = (Math.random() - 0.5) * 0.4;
      } else {
        // Active throw release -> transfer drag momentum to physics speed
        stickerState.vx = dragVx;
        stickerState.vy = dragVy;

        const speed = Math.hypot(dragVx, dragVy);
        if (speed < 0.15) {
          stickerState.vx = (Math.random() - 0.5) * 0.4;
          stickerState.vy = (Math.random() - 0.5) * 0.4;
        }
      }
    }
    document.removeEventListener("mouseup", dragEnd);
    document.removeEventListener("touchend", dragEnd);
    document.removeEventListener("mousemove", dragMove);
    document.removeEventListener("touchmove", dragMove);
  }
}
