
/* ==========================================
   NOCTURNE VOID
   COMPLETE WEBSITE SCRIPT
   SUPABASE + COMMUNITY + PRIVATE MESSAGES
   AVATAR UPLOAD + NOTIFICATION SOUNDS
   ========================================== */

(() => {
  "use strict";

  /* ==========================================
     1. CONFIGURATION
     ========================================== */

  const SUPABASE_URL =
    "https://huzjjefknbicqxbhcryk.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_CxmbXvQwPwOSC0WDx5HJng_qytHjcqc";

  const WEBSITE_URL =
    "https://nightclubvirus-bit.github.io/Nocturne-Void/";

  const AVATAR_BUCKET = "avatars";
  const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

  const SOUND_SETTING_KEY = "nocturneVoidSounds";

  let supabaseClient = null;
  let currentUser = null;
  let currentProfile = null;

  let activeChannel = "general";
  let activeFilter = "All";

  let activeView = "channel";
  let activeConversation = null;

  let communitySubscription = null;
  let presenceSubscription = null;
  let directMessageSubscription = null;

  let communityMessages = [];
  let communityProfiles = [];
  let currentCommunityRole = null;
  let onlineMembers = new Set();
  let directMessages = [];
  let conversationProfiles = [];

  let notificationAudioContext = null;

  let notificationSoundsEnabled =
    localStorage.getItem(SOUND_SETTING_KEY) !== "false";

  /* ==========================================
     2. GENERAL HELPERS
     ========================================== */

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    Array.from(parent.querySelectorAll(selector));

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function showStatus(message, isError = false) {
    const status = $("#profileStatus");
    if (!status) return;

    status.textContent = message;
    status.classList.toggle("status-error", isError);
  }

  function getInitial(value) {
    return String(value || "?").trim().charAt(0).toUpperCase();
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function getUsername(profile) {
    return (
      profile?.username ||
      profile?.user_metadata?.username ||
      profile?.email?.split("@")[0] ||
      "Player"
    );
  }

  function getProfile(userId) {
    if (currentProfile?.id === userId) {
      return currentProfile;
    }

    return (
      communityProfiles.find(profile => profile.id === userId) ||
      conversationProfiles.find(profile => profile.id === userId) ||
      null
    );
  }

  function makeAvatar(profile, className = "hub-avatar") {
    const avatar = document.createElement("div");
    avatar.className = className;

    if (profile?.avatar_url) {
      const image = document.createElement("img");

      image.src = profile.avatar_url;
      image.alt = "";
      image.loading = "lazy";

      image.onerror = () => {
        image.remove();
        avatar.textContent = getInitial(getUsername(profile));
      };

      avatar.appendChild(image);
    } else {
      avatar.textContent = getInitial(getUsername(profile));
    }

    return avatar;
  }

  /* ==========================================
     3. AVATAR PROFILE PREVIEW
     ========================================== */

  function renderAvatarProfile() {
    const hub = $(".community-hub");
    if (!hub) return;

    const preview = $(".hub-profile-preview", hub);
    const username = $(".hub-profile-username", hub);
    const button = $(".hub-avatar-upload-button", hub);

    if (preview) {
      preview.replaceChildren(
        makeAvatar(
          currentProfile || currentUser || { username: "Guest" },
          "hub-avatar"
        )
      );
    }

    if (username) {
      username.textContent = currentUser
        ? getUsername(currentProfile || currentUser)
        : "Guest";
    }

    if (button) {
      button.disabled = !currentUser;
      button.textContent = currentUser
        ? "Change Avatar"
        : "Sign in to upload";
    }
  }

  /* ==========================================
     4. AVATAR UPLOAD
     ========================================== */

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!currentUser || !supabaseClient) {
      showStatus("Please sign in first.", true);
      event.target.value = "";
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      showStatus("Please select a JPG or PNG image.", true);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      showStatus("Your avatar must be smaller than 5 MB.", true);
      event.target.value = "";
      return;
    }

    const userId = currentUser.id;
    const button = $(".hub-avatar-upload-button");

    if (button) {
      button.disabled = true;
      button.textContent = "Uploading...";
    }

    showStatus("Uploading your avatar...");

    try {
      const extension = file.type === "image/png" ? "png" : "jpg";
      const filePath = `${userId}/avatar.${extension}`;

      const { error: uploadError } = await supabaseClient
        .storage
        .from(AVATAR_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabaseClient
        .storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);

      if (!publicData?.publicUrl) {
        throw new Error("Could not retrieve your avatar URL.");
      }

      const avatarUrl =
        `${publicData.publicUrl}?v=${Date.now()}`;

      // Make sure the authenticated user is still the same.
      if (!currentUser || currentUser.id !== userId) {
        throw new Error("Your session changed. Please try again.");
      }

      const { data, error: updateError } = await supabaseClient
        .from("community_profiles")
        .update({
          avatar_url: avatarUrl
        })
        .eq("id", userId)
       .select("id, username, avatar_url")
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          "Your profile could not be found. Please check your community_profiles table."
        );
      }

      currentProfile = data;

      communityProfiles = [
        ...communityProfiles.filter(profile => profile.id !== userId),
        data
      ];

      conversationProfiles = conversationProfiles.map(profile =>
        profile.id === userId ? data : profile
      );

      // Refresh every location displaying the avatar.
      renderAvatarProfile();
      renderCommunityMembers();
      renderCommunityMessages();
      renderDirectMessageInbox();

      if (activeView === "dm" && activeConversation?.id === userId) {
        activeConversation = data;
      }

      showStatus("Your avatar has been updated successfully!");

    } catch (error) {
      console.error("Avatar upload error:", error);

      showStatus(
        error.message || "Unable to upload your avatar.",
        true
      );

    } finally {
      if (button) {
        button.disabled = !currentUser;
        button.textContent = currentUser
          ? "Change Avatar"
          : "Sign in to upload";
      }

      event.target.value = "";
    }
  }

  /* ==========================================
     5. AVATAR STYLING
     ========================================== */

  function installAvatarStyles() {
    if ($("#nocturne-avatar-styles")) return;

    const style = document.createElement("style");
    style.id = "nocturne-avatar-styles";

    style.textContent = `
      .hub-profile-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 12px;
        margin-bottom: 18px;
        background: rgba(255,255,255,.035);
        border: 1px solid rgba(190,35,55,.25);
        border-radius: 10px;
      }

      .hub-profile-preview .hub-avatar {
        width: 54px;
        height: 54px;
        min-width: 54px;
        border-radius: 50%;
        overflow: hidden;
      }

      .hub-profile-preview .hub-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }

      .hub-profile-details {
        display: flex;
        flex-direction: column;
        gap: 7px;
        min-width: 0;
      }

      .hub-profile-username {
        color: #fff;
        font-size: 13px;
        overflow-wrap: anywhere;
      }

      .hub-avatar-upload-button {
        padding: 6px 10px;
        color: #fff;
        background: #771d2b;
        border: 0;
        border-radius: 5px;
        cursor: pointer;
        font-size: 11px;
      }

      .hub-avatar-upload-button:hover:not(:disabled) {
        background: #a52b40;
      }

      .hub-avatar-upload-button:disabled {
        opacity: .55;
        cursor: not-allowed;
      }

      .hub-profile-preview .hub-avatar,
      .hub-member-avatar,
      .hub-message .hub-avatar {
        flex-shrink: 0;
      }

      .hub-member-avatar img,
      .hub-message .hub-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }
    `;

    document.head.appendChild(style);
  }

  /* ==========================================
     6. NOTIFICATION SOUNDS
     ========================================== */
function initializeNotificationAudio() {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return null;

  if (!notificationAudioContext) {
    notificationAudioContext = new AudioContextClass();
  }

  return notificationAudioContext;
}
  function playNotificationTone(
    frequency,
    startTime,
    duration,
    volume
  ) {
    const context = initializeNotificationAudio();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";

    oscillator.frequency.setValueAtTime(
      frequency,
      startTime
    );

    gain.gain.setValueAtTime(0.0001, startTime);

    gain.gain.exponentialRampToValueAtTime(
      volume,
      startTime + 0.025
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + duration
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.03);
  }

  function playNotificationSound(type = "private") {
    if (!notificationSoundsEnabled) return;

    const context = initializeNotificationAudio();
    if (!context) return;

    const now = context.currentTime;

    if (type === "private") {
      playNotificationTone(660, now, 0.20, 0.045);
      playNotificationTone(880, now + 0.16, 0.28, 0.045);
    } else {
      playNotificationTone(440, now, 0.16, 0.018);
    }
  }

  function setupNotificationSoundToggle(hub) {
    const header = $(".hub-header", hub);
    if (!header) return;

    const button = document.createElement("button");

    button.type = "button";
    button.className = "hub-sound-toggle";

    function updateButton() {
      button.textContent = notificationSoundsEnabled
        ? "♫ Sounds: ON"
        : "♫ Sounds: OFF";

      button.classList.toggle(
        "sound-enabled",
        notificationSoundsEnabled
      );

      button.setAttribute(
        "aria-pressed",
        String(notificationSoundsEnabled)
      );

      button.title = notificationSoundsEnabled
        ? "Turn notification sounds off"
        : "Turn notification sounds on";
    }

    button.addEventListener("click", () => {
      notificationSoundsEnabled = !notificationSoundsEnabled;

      localStorage.setItem(
        SOUND_SETTING_KEY,
        String(notificationSoundsEnabled)
      );

      if (notificationSoundsEnabled) {
        initializeNotificationAudio();
        playNotificationSound("public");
      }

      updateButton();
    });

    updateButton();
    header.appendChild(button);

    document.addEventListener(
      "pointerdown",
      initializeNotificationAudio,
      { once: true }
    );

    document.addEventListener(
      "keydown",
      initializeNotificationAudio,
      { once: true }
    );
  }

  /* ==========================================
     7. SUPABASE CONNECTION
     ========================================== */

  function connectSupabase() {
    if (!window.supabase?.createClient) {
      console.error("Supabase library could not load.");
      showStatus("Account services could not load.", true);
      return;
    }

    try {
      supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
      );

      initializeAuthentication();

    } catch (error) {
      console.error("Supabase connection error:", error);
    }
  }

    /* ==========================================
     8. GAME LIBRARY
     ========================================== */

  const games = [
    {
      title: "Silent Hill 2",
      category: "Horror",
      description: "Return to a haunting town filled with memories, mysteries, and nightmares.",
      platform: "PC / Console",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80",
      url: "https://store.steampowered.com/app/2124490/SILENT_HILL_2/"
    },
    {
      title: "Elden Ring",
      category: "Adventure",
      description: "Explore a mysterious world filled with ancient secrets and powerful enemies.",
      platform: "PC / Console",
      image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
      url: "https://store.steampowered.com/app/1245620/ELDEN_RING/"
    },
    {
      title: "Resident Evil",
      category: "Horror",
      description: "Survive terrifying encounters in a world where danger waits around every corner.",
      platform: "PC / Console",
      image: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=900&q=80",
      url: "https://store.steampowered.com/franchise/residentevil"
    },
    {
      title: "Dark Souls III",
      category: "Action",
      description: "Face unforgiving challenges in a dark fantasy world.",
      platform: "PC / Console",
      image: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80",
      url: "https://store.steampowered.com/app/374320/DARK_SOULS_III/"
    },
    {
      title: "The Witcher 3",
      category: "Adventure",
      description: "Discover a vast fantasy world filled with monsters, magic, and choices.",
      platform: "PC / Console",
      image: "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?auto=format&fit=crop&w=900&q=80",
      url: "https://store.steampowered.com/app/292030/The_Witcher_3_Wild_Hunt/"
    },
    {
      title: "Dead by Daylight",
      category: "Horror",
      description: "Escape the nightmare or become the thing everyone fears.",
      platform: "PC / Console",
      image: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=900&q=80",
      url: "https://store.steampowered.com/app/381210/Dead_by_Daylight/"
    },
    {
      title: "THE HOLLOW",
      category: "Horror",
      description: "Something is waiting inside the abandoned hospital. Find the key. Reach the exit. Do not let it find you.",
      platform: "Browser · Original NV Game",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80",
      original: true
    }
  ];

  function renderGames() {
    const grid = $("#gameGrid");
    if (!grid) return;

    const term =
      $("#gameSearch")?.value.trim().toLowerCase() || "";

    const filtered = games.filter(game => {
      const matchesSearch =
        game.title.toLowerCase().includes(term) ||
        game.description.toLowerCase().includes(term) ||
        game.category.toLowerCase().includes(term);

      const matchesFilter =
        activeFilter === "All" ||
        game.category === activeFilter;

      return matchesSearch && matchesFilter;
    });

    grid.replaceChildren();

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No games found. Try another search.";
      grid.appendChild(empty);
      return;
    }

    filtered.forEach(game => {
      const card = document.createElement("article");
      card.className = "game-card";

      const art = document.createElement("div");
      art.className = "game-art";
      art.style.backgroundImage = `url("${game.image}")`;

      const tag = document.createElement("span");
      tag.className = "game-tag";
      tag.textContent = game.original ? "NOCTURNE ORIGINAL" : game.category;
      art.appendChild(tag);

      const info = document.createElement("div");
      info.className = "game-info";

      const title = document.createElement("h3");
      title.textContent = game.title;

      const description = document.createElement("p");
      description.textContent = game.description;

      const meta = document.createElement("div");
      meta.className = "game-meta";

      const platform = document.createElement("span");
      platform.textContent = game.platform;

      const category = document.createElement("span");
      category.textContent = game.category.toUpperCase();

      meta.append(platform, category);

      const discover = document.createElement("button");
      discover.type = "button";
      discover.className = "nv-discover-button";
      discover.textContent = "Discover ↗";

      discover.addEventListener("click", () => {
        openGameDetails(game);
      });

      info.append(title, description, meta, discover);
      card.append(art, info);
      grid.appendChild(card);
    });
  }

  function initializeGameLibrary() {
    $("#gameSearch")?.addEventListener("input", renderGames);

    $$("#filters button").forEach(button => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.filter || "All";

        $$("#filters button").forEach(item => {
          item.classList.toggle("active", item === button);
        });

        renderGames();
      });
    });

    renderGames();
  } 
     /* ==========================================
     8.5. NOCTURNE VOID 3D GAME SYSTEM
     THE HOLLOW — FIRST PERSON HORROR
     ========================================== */

  let gameThreePromise = null;
  let activeGame = null;

  function installGameStyles() {
    if ($("#nv-game-styles")) return;

    const style = document.createElement("style");
    style.id = "nv-game-styles";

    style.textContent = `
      .nv-discover-button {
        display: block;
        width: 100%;
        margin-top: 16px;
        padding: 12px;
        color: #fff;
        background: #741b2a;
        border: 1px solid #a52b40;
        border-radius: 5px;
        cursor: pointer;
        font: inherit;
        transition: .2s;
      }

      .nv-discover-button:hover {
        background: #a52b40;
        transform: translateY(-2px);
      }

      .nv-game-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(0,0,0,.94);
        color: #fff;
      }

      .nv-game-overlay.nv-visible {
        display: flex;
      }

      .nv-game-panel {
        width: min(1100px, 100%);
        max-height: 95vh;
        overflow-y: auto;
        background: #100b10;
        border: 1px solid rgba(190,35,55,.45);
        border-radius: 12px;
        box-shadow: 0 20px 90px #000;
      }

      .nv-game-detail {
        padding: 30px;
      }

      .nv-game-detail h2 {
        font-family: Cinzel, serif;
        font-size: clamp(28px, 5vw, 48px);
        margin: 10px 0;
      }

      .nv-game-detail p {
        color: #c4b9c0;
        line-height: 1.8;
      }

      .nv-game-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }

      .nv-game-action {
        padding: 13px 22px;
        border: 1px solid #852336;
        border-radius: 5px;
        background: #771d2b;
        color: white;
        cursor: pointer;
        text-decoration: none;
        font: inherit;
      }

      .nv-game-action:hover {
        background: #a52b40;
      }

      .nv-game-close {
        float: right;
        background: transparent;
        color: white;
        border: 0;
        font-size: 28px;
        cursor: pointer;
      }

      .nv-game-screen {
        position: relative;
        width: 100%;
        height: min(72vh, 720px);
        min-height: 380px;
        overflow: hidden;
        background: #030303;
      }

      .nv-game-screen canvas {
        display: block;
        width: 100%;
        height: 100%;
      }

      .nv-game-hud {
        position: absolute;
        inset: 0;
        pointer-events: none;
        padding: 20px;
        font-family: Inter, sans-serif;
        text-shadow: 0 2px 5px #000;
      }

      .nv-hud-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 13px;
        letter-spacing: 1px;
      }

      .nv-hud-health {
        color: #ff536c;
      }

      .nv-hud-objective {
        position: absolute;
        left: 20px;
        bottom: 20px;
        max-width: 75%;
        font-size: 13px;
        color: #eee;
      }

      .nv-hud-message {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        width: 85%;
        font-size: clamp(15px, 3vw, 23px);
        color: #fff;
        line-height: 1.6;
      }

      .nv-game-start {
        position: absolute;
        inset: 0;
        z-index: 4;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 25px;
        background: rgba(0,0,0,.82);
      }

      .nv-game-start h2 {
        font-family: Cinzel, serif;
        font-size: clamp(30px, 5vw, 55px);
        margin: 0 0 12px;
      }

      .nv-game-start p {
        max-width: 540px;
        color: #c9c0c5;
        line-height: 1.7;
      }

      .nv-game-start button {
        margin-top: 20px;
        padding: 14px 30px;
        background: #821f31;
        color: white;
        border: 1px solid #c43b51;
        border-radius: 5px;
        cursor: pointer;
        font: inherit;
      }

      .nv-game-start button:hover {
        background: #a52b40;
      }

      .nv-game-controls {
        padding: 15px 20px;
        color: #aaa;
        font-size: 12px;
        line-height: 1.8;
      }

      .nv-game-controls strong {
        color: #eee;
      }

      .nv-game-mobile {
        position: absolute;
        bottom: 65px;
        right: 15px;
        display: none;
        gap: 8px;
        pointer-events: auto;
      }

      .nv-game-mobile button {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(100,20,35,.8);
        color: white;
        border: 1px solid #b43b50;
      }

      @media (max-width: 700px) {
        .nv-game-detail {
          padding: 20px;
        }

        .nv-game-mobile {
          display: flex;
        }

        .nv-game-screen {
          min-height: 350px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createGameOverlay() {
    let overlay = $("#nvGameOverlay");

    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "nvGameOverlay";
    overlay.className = "nv-game-overlay";

    overlay.innerHTML = `
      <div class="nv-game-panel">
        <div class="nv-game-detail" id="nvGameDetails">
          <button class="nv-game-close" id="nvGameClose" aria-label="Close">×</button>
          <p class="eyebrow">NOCTURNE VOID ORIGINAL</p>
          <h2 id="nvGameTitle"></h2>
          <p id="nvGameDescription"></p>
          <div class="nv-game-actions" id="nvGameActions"></div>
        </div>

        <div class="nv-game-screen" id="nvGameScreen" hidden>
          <div class="nv-game-hud">
            <div class="nv-hud-top">
              <span>THE HOLLOW</span>
              <span class="nv-hud-health" id="nvGameHealth">HEALTH: 100</span>
            </div>
            <div class="nv-hud-objective" id="nvGameObjective">
              OBJECTIVE: Find the exit key.
            </div>
            <div class="nv-hud-message" id="nvGameMessage"></div>
          </div>

          <div class="nv-game-start" id="nvGameStart">
            <h2>THE HOLLOW</h2>
            <p>
              You wake up inside an abandoned hospital.
              The doors are locked. Your flashlight flickers.
              Something is moving in the darkness.
            </p>
            <p>Find the key. Reach the exit. Survive.</p>
            <button id="nvGameBegin">ENTER THE HOSPITAL</button>
          </div>

          <div class="nv-game-mobile">
            <button data-move="forward">↑</button>
            <button data-move="backward">↓</button>
            <button data-move="left">←</button>
            <button data-move="right">→</button>
          </div>
        </div>

        <div class="nv-game-controls" id="nvGameControls" hidden>
          <strong>CONTROLS:</strong>
          WASD — Move · Mouse — Look around · SHIFT — Run · E — Interact · ESC — Pause
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    $("#nvGameClose", overlay).addEventListener("click", closeGameOverlay);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeGameOverlay();
    });

    return overlay;
  }

  function openGameDetails(game) {
    installGameStyles();

    const overlay = createGameOverlay();

    $("#nvGameDetails").hidden = false;
    $("#nvGameScreen").hidden = true;
    $("#nvGameControls").hidden = true;

    setText("nvGameTitle", game.title);
    setText("nvGameDescription", game.description);

    const actions = $("#nvGameActions");
    actions.replaceChildren();

    const play = document.createElement("button");
    play.type = "button";
    play.className = "nv-game-action";
    play.textContent = game.original ? "Play Now ↗" : "View on Steam ↗";

    play.addEventListener("click", () => {
      if (game.original) {
        startHollowGame();
      } else if (game.url) {
        window.open(game.url, "_blank", "noopener,noreferrer");
      }
    });

    actions.appendChild(play);

    const back = document.createElement("button");
    back.type = "button";
    back.className = "nv-game-action";
    back.textContent = "Back to Library";

    back.addEventListener("click", closeGameOverlay);

    actions.appendChild(back);

    overlay.classList.add("nv-visible");
  }

  function closeGameOverlay() {
    stopHollowGame();

    const overlay = $("#nvGameOverlay");
    if (overlay) overlay.classList.remove("nv-visible");
  }

  async function loadThreeJS() {
    if (window.THREE) return window.THREE;

    if (!gameThreePromise) {
      gameThreePromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src =
         "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js";

        script.onload = () => {
          if (window.THREE) {
            resolve(window.THREE);
          } else {
            reject(new Error("3D engine failed to initialize."));
          }
        };

        script.onerror = () => {
          gameThreePromise = null;
          reject(new Error("Could not load the 3D game engine. Check your internet connection."));
        };

        document.head.appendChild(script);
      });
    }

    return gameThreePromise;
  }

  async function startHollowGame() {
    const overlay = createGameOverlay();

    $("#nvGameDetails").hidden = true;
    $("#nvGameScreen").hidden = false;
    $("#nvGameControls").hidden = false;

    overlay.classList.add("nv-visible");

    const start = $("#nvGameStart");
    start.hidden = false;

    try {
      await loadThreeJS();

      if (!$("#nvGameOverlay")?.classList.contains("nv-visible")) {
        return;
      }

      createHollowWorld();

    } catch (error) {
      console.error("THE HOLLOW loading error:", error);

      start.innerHTML = `
        <h2>GAME COULD NOT LOAD</h2>
        <p>${error.message}</p>
        <button id="nvGameRetry">TRY AGAIN</button>
      `;

      $("#nvGameRetry").addEventListener("click", startHollowGame);
    }
  }

  function createHollowWorld() {
    stopHollowGame();

    const THREE = window.THREE;
    const screen = $("#nvGameScreen");

    if (!THREE || !screen) return;

    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x030406);
    scene.fog = new THREE.FogExp2(0x08090d, 0.045);

    const camera = new THREE.PerspectiveCamera(
      75,
      screen.clientWidth / screen.clientHeight,
      0.1,
      100
    );

    camera.position.set(0, 1.65, 4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(screen.clientWidth, screen.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    screen.prepend(renderer.domElement);

    const ambient = new THREE.HemisphereLight(
      0x75809b,
      0x100b0c,
      0.25
    );

    scene.add(ambient);

    const ceilingLight = new THREE.PointLight(
      0x9b172b,
      3,
      12
    );

    ceilingLight.position.set(0, 3.4, -12);
    ceilingLight.castShadow = true;
    scene.add(ceilingLight);

    const cameraTarget = new THREE.Object3D();
    cameraTarget.position.set(0, 0, -5);
    camera.add(cameraTarget);

    const flashlight = new THREE.SpotLight(
      0xe0e7ff,
      90,
      24,
      Math.PI / 7,
      0.55,
      1.2
    );

    flashlight.position.set(0, 0, 0);
    flashlight.target = cameraTarget;
    camera.add(flashlight);
    camera.add(flashlight.target);

    scene.add(camera);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x28252a,
      roughness: 0.95
    });

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x343039,
      roughness: 0.95
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x100e13,
      roughness: 1
    });

    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x55545b,
      metalness: 0.65,
      roughness: 0.45
    });

    const redMaterial = new THREE.MeshStandardMaterial({
      color: 0x50101c,
      roughness: 0.8
    });

    function addBox(x, y, z, width, height, depth, material) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        material
      );

      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      return mesh;
    }

    // Hospital floor and ceiling.
    addBox(0, -0.15, -17, 8, 0.3, 46, floorMaterial);
    addBox(0, 4, -17, 8, 0.3, 46, darkMaterial);

    // Main corridor walls.
    addBox(-4, 2, -17, 0.3, 4, 46, wallMaterial);
    addBox(4, 2, -17, 0.3, 4, 46, wallMaterial);

    // End wall.
    addBox(0, 2, -40, 8, 4, 0.3, wallMaterial);

    // Ceiling lamps.
    [-5, -14, -23, -32].forEach((z, index) => {
      const lamp = new THREE.PointLight(
        index % 2 === 0 ? 0x5a1722 : 0x77809a,
        1.2,
        7
      );

      lamp.position.set(0, 3.55, z);
      scene.add(lamp);

      const fixture = addBox(
        0,
        3.7,
        z,
        1.1,
        0.08,
        0.35,
        metalMaterial
      );
    });

    // Hospital room openings and furniture.
    addBox(-2.5, 0.7, -10, 1.4, 1.4, 0.8, metalMaterial);
    addBox(2.3, 0.5, -23, 1.6, 1, 1, darkMaterial);
    addBox(-2.4, 1, -30, 1.5, 2, 0.3, redMaterial);

    // Bed-like hospital furniture.
    addBox(-2.1, 0.55, -11, 1.5, 0.15, 2.4, metalMaterial);
    addBox(-2.1, 0.8, -11, 1.35, 0.35, 2.1, darkMaterial);

    // Medical cabinets.
    addBox(2.7, 1.1, -7, 0.7, 2.2, 0.6, metalMaterial);
    addBox(2.7, 1.1, -27, 0.7, 2.2, 0.6, metalMaterial);

    // Exit door.
    const exitDoor = addBox(
      0,
      1.65,
      -39.4,
      2.2,
      3.3,
      0.25,
      redMaterial
    );

    // Door sign.
    addBox(0, 3.3, -39.15, 1.2, 0.25, 0.05, metalMaterial);

    // Collectible key.
    const key = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.065, 8, 18),
      new THREE.MeshStandardMaterial({
        color: 0xf2c75c,
        metalness: 0.85,
        roughness: 0.25,
        emissive: 0x6a3d00
      })
    );

    key.position.set(2.2, 1.1, -17);
    key.castShadow = true;
    scene.add(key);

    const keyLight = new THREE.PointLight(
      0xffbd44,
      2,
      4
    );

    keyLight.position.copy(key.position);
    scene.add(keyLight);

    // Enemy model.
    const enemy = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.38, 1.35, 8),
      new THREE.MeshStandardMaterial({
        color: 0x171016,
        roughness: 1
      })
    );

    body.position.y = 0.9;
    body.castShadow = true;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x080608,
        roughness: 1
      })
    );

    head.position.y = 1.75;
    head.castShadow = true;

    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff152b
    });

    const leftEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      eyeMaterial
    );

    leftEye.position.set(-0.12, 1.78, -0.25);

    const rightEye = leftEye.clone();
    rightEye.position.x = 0.12;

    enemy.add(body, head, leftEye, rightEye);
    enemy.position.set(-1, 0, -30);
    scene.add(enemy);

    let health = 100;
    let hasKey = false;
    let gameRunning = false;
    let gameEnded = false;
    let isPaused = false;
    let damageCooldown = 0;
    let enemySpeed = 1.15;

    const keys = {};
    const mobileMoves = new Set();

    let animationFrame = null;
    let previousTime = 0;
    let yaw = 0;
    let pitch = 0;

    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();

    function updateHUD() {
      setText("nvGameHealth", `HEALTH: ${health}`);

      setText(
        "nvGameObjective",
        hasKey
          ? "OBJECTIVE: Reach the exit door."
          : "OBJECTIVE: Find the hospital exit key."
      );
    }

    function showGameMessage(message) {
      const element = $("#nvGameMessage");
      if (!element) return;

      element.textContent = message;

      clearTimeout(showGameMessage.timeout);

      showGameMessage.timeout = setTimeout(() => {
        if (element) element.textContent = "";
      }, 2600);
    }

    function finishGame(won) {
      if (gameEnded) return;

      gameEnded = true;
      gameRunning = false;

      document.exitPointerLock?.();

      const start = $("#nvGameStart");
      start.hidden = false;

      start.innerHTML = won
        ? `
          <h2>YOU ESCAPED.</h2>
          <p>The doors open. You made it out of the hospital.</p>
          <button id="nvGameRestart">PLAY AGAIN</button>
        `
        : `
          <h2>YOU DIDN'T MAKE IT.</h2>
          <p>The darkness finally caught up with you.</p>
          <button id="nvGameRestart">TRY AGAIN</button>
        `;

      $("#nvGameRestart").addEventListener("click", () => {
        startHollowGame();
      });
    }

    function interact() {
      if (gameEnded || isPaused) return;

      const player = camera.position;

      if (!hasKey && player.distanceTo(key.position) < 2.2) {
        hasKey = true;
        scene.remove(key);
        scene.remove(keyLight);

        showGameMessage("You found the exit key.");
        updateHUD();

        return;
      }

      if (player.distanceTo(exitDoor.position) < 3) {
        if (hasKey) {
          finishGame(true);
        } else {
          showGameMessage("The door is locked. Find the key.");
        }

        return;
      }

      showGameMessage("There is nothing to interact with here.");
    }

    function onKeyDown(event) {
      keys[event.code] = true;

      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
          .includes(event.code)
      ) {
        event.preventDefault();
      }

      if (event.code === "KeyE") interact();

      if (event.code === "Escape" && gameRunning) {
        isPaused = true;
        showGameMessage("PAUSED — Click the game to continue.");
      }
    }

    function onKeyUp(event) {
      keys[event.code] = false;
    }

    function onMouseMove(event) {
      if (!gameRunning || document.pointerLockElement !== renderer.domElement) {
        return;
      }

      yaw -= event.movementX * 0.002;
      pitch -= event.movementY * 0.002;

      pitch = Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, pitch)
      );

      camera.rotation.order = "YXZ";
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
    }

    function onPointerLockChange() {
      if (
        document.pointerLockElement !== renderer.domElement &&
        gameRunning &&
        !gameEnded
      ) {
        isPaused = true;
      } else if (document.pointerLockElement === renderer.domElement) {
        isPaused = false;
      }
    }

    function onCanvasClick() {
      if (gameRunning && !gameEnded) {
        renderer.domElement.requestPointerLock?.();
      }
    }

    function onResize() {
      if (!activeGame || !renderer.domElement.isConnected) return;

      const width = screen.clientWidth;
      const height = screen.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    }

    function update(delta) {
      if (!gameRunning || isPaused || gameEnded) return;

      const movingForward =
        keys.KeyW || keys.ArrowUp || mobileMoves.has("forward");

      const movingBackward =
        keys.KeyS || keys.ArrowDown || mobileMoves.has("backward");

      const movingLeft =
        keys.KeyA || keys.ArrowLeft || mobileMoves.has("left");

      const movingRight =
        keys.KeyD || keys.ArrowRight || mobileMoves.has("right");

      const sprinting = keys.ShiftLeft || keys.ShiftRight;

      const speed = sprinting ? 5.2 : 3.1;

      direction.set(0, 0, 0);

      if (movingForward) direction.z -= 1;
      if (movingBackward) direction.z += 1;
      if (movingLeft) direction.x -= 1;
      if (movingRight) direction.x += 1;

      if (direction.lengthSq() > 0) {
        direction.normalize();

        const forward = new THREE.Vector3(
          -Math.sin(yaw),
          0,
          -Math.cos(yaw)
        );

        const right = new THREE.Vector3(
          Math.cos(yaw),
          0,
          -Math.sin(yaw)
        );

        velocity
          .copy(forward)
          .multiplyScalar(-direction.z)
          .addScaledVector(right, direction.x)
          .normalize()
          .multiplyScalar(speed * delta);

        camera.position.add(velocity);
      }

      // Keep player inside the hospital corridor.
      camera.position.x = THREE.MathUtils.clamp(
        camera.position.x,
        -3.35,
        3.35
      );

      camera.position.z = THREE.MathUtils.clamp(
        camera.position.z,
        -38,
        4
      );

      camera.position.y = 1.65;

      // The enemy hunts the player.
      const enemyDistance = enemy.position.distanceTo(
        camera.position
      );

      if (enemyDistance < 22) {
        const chaseDirection = new THREE.Vector3()
          .subVectors(camera.position, enemy.position);

        chaseDirection.y = 0;

        if (chaseDirection.lengthSq() > 0.001) {
          chaseDirection.normalize();

          enemy.position.addScaledVector(
            chaseDirection,
            enemySpeed * delta
          );

          enemy.lookAt(
            camera.position.x,
            enemy.position.y,
            camera.position.z
          );
        }
      }

      // Damage when the enemy reaches the player.
      damageCooldown -= delta;

      if (enemyDistance < 1.35 && damageCooldown <= 0) {
        health = Math.max(0, health - 15);
        damageCooldown = 1.2;

        updateHUD();
        showGameMessage("THE CREATURE FOUND YOU.");

        if (health <= 0) {
          finishGame(false);
        }
      }

      key.rotation.y += delta * 1.8;

      // Slightly unstable hospital lighting.
      ceilingLight.intensity =
        2.3 + Math.sin(performance.now() * 0.006) * 0.7;
    }

    function animate(time) {
      if (!activeGame || activeGame.renderer !== renderer) return;

      animationFrame = requestAnimationFrame(animate);

      const delta = Math.min(
        (time - previousTime) / 1000 || 0,
        0.05
      );

      previousTime = time;

      update(delta);
      renderer.render(scene, camera);
    }

    function startPlaying() {
      if (gameEnded) return;

      gameRunning = true;
      isPaused = false;

      $("#nvGameStart").hidden = true;

      renderer.domElement.requestPointerLock?.();
    }

    function bindMobileControls() {
      $$(".nv-game-mobile button", screen).forEach(button => {
        const move = button.dataset.move;

        button.addEventListener("pointerdown", event => {
          event.preventDefault();
          mobileMoves.add(move);
        });

        ["pointerup", "pointerleave", "pointercancel"].forEach(type => {
          button.addEventListener(type, () => {
            mobileMoves.delete(move);
          });
        });
      });
    }

    $("#nvGameBegin").onclick = startPlaying;

    renderer.domElement.addEventListener("click", onCanvasClick);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);

    document.addEventListener(
      "pointerlockchange",
      onPointerLockChange
    );

    bindMobileControls();
    updateHUD();

    activeGame = {
      renderer,
      scene,
      camera,
      animationFrame,
      cleanup() {
        gameRunning = false;

        cancelAnimationFrame(animationFrame);

        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("resize", onResize);

        document.removeEventListener(
          "pointerlockchange",
          onPointerLockChange
        );

        renderer.domElement.removeEventListener(
          "click",
          onCanvasClick
        );

        renderer.dispose();

        scene.traverse(object => {
          object.geometry?.dispose();

          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material?.dispose();
          }
        });

        renderer.domElement.remove();
      }
    };

    animationFrame = requestAnimationFrame(animate);
    activeGame.animationFrame = animationFrame;
  }

  function stopHollowGame() {
    if (activeGame) {
      activeGame.cleanup();
      activeGame = null;
    }

    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  installGameStyles();
   
    /* ==========================================
     9. LEADERBOARD
     ========================================== */

  const leaderboardPlayers = [
    { name: "NightWalker", level: "Elite Player", score: "9,850" },
    { name: "CrimsonSoul", level: "Veteran", score: "8,420" },
    { name: "VoidHunter", level: "Veteran", score: "7,900" },
    { name: "ShadowBloom", level: "Rising Player", score: "6,750" },
    { name: "GrimReaper", level: "Rising Player", score: "5,980" }
  ];

  function renderLeaderboard() {
    const container = $("#leaderRows");
    if (!container) return;

    container.replaceChildren();

    leaderboardPlayers.forEach((player, index) => {
      const row = document.createElement("div");
      row.className = "leader-row";

      const rank = document.createElement("div");
      rank.className = "rank";
      rank.textContent = `#${index + 1}`;

      const name = document.createElement("div");
      name.className = "player";
      name.textContent = player.name;

      const level = document.createElement("small");
      level.textContent = player.level;
      name.appendChild(level);

      const score = document.createElement("div");
      score.className = "score";
      score.textContent = `${player.score} XP`;

      row.append(rank, name, score);
      container.appendChild(row);
    });
  }

  /* ==========================================
     10. ACCOUNT DIALOG
     ========================================== */

  const accountDialog = $("#accountDialog");
  let authMode = "login";

  function openAccountDialog() {
    if (accountDialog && !accountDialog.open) {
      accountDialog.showModal();
    }
  }

  function closeAccountDialog() {
    if (accountDialog?.open) accountDialog.close();
  }

  function setAuthMode(mode) {
    authMode = mode;

    const form = $("#accountForm");
    const tabs = $("#authTabs");
    const resetForm = $("#resetPasswordForm");

    if (form) form.hidden = false;
    if (tabs) tabs.hidden = false;

    resetForm?.remove();

    setText(
      "accountTitle",
      mode === "signup" ? "Create Your Account" : "Welcome Back"
    );

    setText(
      "accountDescription",
      mode === "signup"
        ? "Join the world of Nocturne Void."
        : "Enter the darkness and continue your journey."
    );

    const usernameLabel = $("#usernameLabel");
    if (usernameLabel) {
      usernameLabel.hidden = mode !== "signup";
    }

    const submit = $("#accountSubmit");

    if (submit) {
      submit.textContent =
        mode === "signup" ? "Create Account" : "Sign In";
    }

    const password = $("#accountPassword");

    if (password) {
      password.autocomplete =
        mode === "signup" ? "new-password" : "current-password";
    }

    $$("#authTabs button").forEach(button => {
      const buttonMode =
        button.dataset.mode ||
        button.dataset.authMode ||
        button.value;

      button.classList.toggle("active", buttonMode === mode);
    });

    showStatus("");
  }

  function initializeAccountButtons() {
    $("#accountButton")?.addEventListener("click", () => {
      openAccountDialog();

      if (currentUser) {
        showStatus(
          `Signed in as ${getUsername(currentProfile || currentUser)}`
        );
      } else {
        setAuthMode("login");
      }
    });

    $("#authTabs")?.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;

      const mode =
        button.dataset.mode ||
        button.dataset.authMode ||
        button.value;

      if (mode === "login" || mode === "signup") {
        setAuthMode(mode);
      }
    });

    accountDialog?.addEventListener("click", event => {
      if (event.target === accountDialog) closeAccountDialog();
    });

    $("#accountForm")?.addEventListener(
      "submit",
      handleAccountSubmit
    );

    const form = $("#accountForm");

    if (form && !$(".forgot-password", form)) {
      const forgot = document.createElement("button");

      forgot.type = "button";
      forgot.className = "forgot-password";
      forgot.textContent = "Forgot your password?";

      forgot.addEventListener("click", handleForgotPassword);

      form.appendChild(forgot);
    }

    $("#logoutButton")?.addEventListener("click", handleLogout);

    setAuthMode("login");
  }

  /* ==========================================
     11. SIGNUP AND LOGIN
     ========================================== */

  async function handleAccountSubmit(event) {
    event.preventDefault();

    if (!supabaseClient) {
      showStatus("Account services are unavailable.", true);
      return;
    }

    const username = $("#playerName")?.value.trim() || "";
    const email = $("#accountEmail")?.value.trim() || "";
    const password = $("#accountPassword")?.value || "";

    if (!email || !password) {
      showStatus("Enter your email and password.", true);
      return;
    }

    if (authMode === "signup" && !username) {
      showStatus("Please choose a username.", true);
      return;
    }

    if (password.length < 8) {
      showStatus(
        "Password must contain at least 8 characters.",
        true
      );
      return;
    }

    if (username.length > 18) {
      showStatus(
        "Username must be 18 characters or fewer.",
        true
      );
      return;
    }

    const submit = $("#accountSubmit");

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Please wait...";
    }

    showStatus("");

    try {
      if (authMode === "signup") {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: WEBSITE_URL,
            data: { username }
          }
        });

        if (error) throw error;

        showStatus(
          data.session
            ? "Account created successfully!"
            : "Account created! Check your email for confirmation."
        );

      } else {
        const { error } =
          await supabaseClient.auth.signInWithPassword({
            email,
            password
          });

        if (error) throw error;

        showStatus("You are now signed in!");
      }

    } catch (error) {
      console.error("Authentication error:", error);
      showStatus(error.message || "Something went wrong.", true);

    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent =
          authMode === "signup" ? "Create Account" : "Sign In";
      }
    }
  }

  /* ==========================================
     12. PASSWORD RECOVERY
     ========================================== */

  async function handleForgotPassword() {
    if (!supabaseClient) return;

    const email = $("#accountEmail")?.value.trim() || "";

    if (!email) {
      showStatus("Enter your email address first.", true);
      $("#accountEmail")?.focus();
      return;
    }

    showStatus("Sending password reset email...");

    try {
      const { error } =
        await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: WEBSITE_URL
        });

      if (error) throw error;

      showStatus("Password reset email sent! Check your inbox.");

    } catch (error) {
      console.error(error);
      showStatus(error.message, true);
    }
  }

  function showPasswordUpdateForm() {
    if (!accountDialog) return;

    const accountForm = $("#accountForm");
    const tabs = $("#authTabs");

    if (accountForm) accountForm.hidden = true;
    if (tabs) tabs.hidden = true;

    setText("accountTitle", "Create a New Password");
    setText("accountDescription", "Choose a new password.");

    let form = $("#resetPasswordForm");

    if (!form) {
      form = document.createElement("form");
      form.id = "resetPasswordForm";

      const firstLabel = document.createElement("label");
      firstLabel.textContent = "New Password";

      const firstInput = document.createElement("input");
      firstInput.type = "password";
      firstInput.id = "newPassword";
      firstInput.minLength = 8;
      firstInput.required = true;
      firstInput.autocomplete = "new-password";

      firstLabel.appendChild(firstInput);

      const secondLabel = document.createElement("label");
      secondLabel.textContent = "Confirm New Password";

      const secondInput = document.createElement("input");
      secondInput.type = "password";
      secondInput.id = "confirmNewPassword";
      secondInput.minLength = 8;
      secondInput.required = true;
      secondInput.autocomplete = "new-password";

      secondLabel.appendChild(secondInput);

      const submit = document.createElement("button");
      submit.type = "submit";
      submit.className = "button button-primary";
      submit.textContent = "Update Password";

      form.append(firstLabel, secondLabel, submit);
      accountDialog.appendChild(form);

      form.addEventListener("submit", async event => {
        event.preventDefault();

        const password = $("#newPassword").value;
        const confirm = $("#confirmNewPassword").value;

        if (password.length < 8) {
          showStatus(
            "Password must be at least 8 characters.",
            true
          );
          return;
        }

        if (password !== confirm) {
          showStatus("Your passwords do not match.", true);
          return;
        }

        showStatus("Updating password...");

        try {
          const { error } = await supabaseClient.auth.updateUser({
            password
          });

          if (error) throw error;

          showStatus("Password updated successfully!");
          form.remove();

          if (accountForm) accountForm.hidden = false;
          if (tabs) tabs.hidden = false;

          setAuthMode("login");

        } catch (error) {
          console.error(error);
          showStatus(error.message, true);
        }
      });
    }

    openAccountDialog();
  }

  /* ==========================================
     13. LOGOUT
     ========================================== */

  async function handleLogout() {
    if (!supabaseClient) return;

    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;

      showStatus("You have signed out.");
      updateAccountUI(null);
      setAuthMode("login");

    } catch (error) {
      console.error(error);
      showStatus(error.message, true);
    }
  }

  /* ==========================================
     14. AUTHENTICATION
     ========================================== */

  function initializeAuthentication() {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null;

      updateAccountUI(user);

      if (event === "PASSWORD_RECOVERY") {
        setTimeout(showPasswordUpdateForm, 0);
      }

      if (user) {
        setTimeout(() => {
          if (currentUser?.id !== user.id) return;

          loadCurrentProfile();
          loadCommunityMessages();
          loadCommunityProfiles();
          loadDirectMessageInbox();
          startPresence();
          subscribeToDirectMessages();
        }, 0);

      } else {
        currentProfile = null;
        communityProfiles = [];
        onlineMembers.clear();
        directMessages = [];
        conversationProfiles = [];
        communityMessages = [];
        activeConversation = null;
        activeView = "channel";

        stopCommunitySubscriptions();
        stopPresence();
        stopDirectMessageSubscription();

        renderAvatarProfile();
        renderCommunityMembers();
        renderDirectMessageInbox();
        showChannelView();
      }
    });

    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error(error);
        return;
      }

      const user = data.session?.user || null;

      updateAccountUI(user);

      if (user) {
        loadCurrentProfile();
        loadCommunityMessages();
        loadCommunityProfiles();
        loadDirectMessageInbox();
        startPresence();
        subscribeToDirectMessages();
      }

      if (window.location.hash.includes("type=recovery")) {
        showPasswordUpdateForm();
      }
    });
  }

  function updateAccountUI(user) {
    currentUser = user || null;

    const button = $("#accountButton");
    const logout = $("#logoutButton");

    if (button) {
      button.textContent = currentUser
        ? "My Account"
        : "Sign In";
    }

    if (logout) {
      logout.hidden = !currentUser;
    }

    if (!currentUser) {
      currentProfile = null;
    }

    renderAvatarProfile();
    renderCommunityMembers();
  }

  /* ==========================================
     15. COMMUNITY CHANNELS
     ========================================== */

const channels = [
  {
    id: "general",
    name: "General",
    description: "Talk about anything and everything.",
    category: "COMMUNITY"
  },
  {
    id: "introductions",
    name: "Introductions",
    description: "Introduce yourself to the community.",
    category: "COMMUNITY"
  },
  {
    id: "gaming",
    name: "Gaming",
    description: "Discuss your favorite games.",
    category: "GAMING"
  },
  {
    id: "looking-for-group",
    name: "Looking for Group",
    description: "Find other players to game with.",
    category: "GAMING"
  },
  {
    id: "media",
    name: "Media",
    description: "Share gaming clips, screenshots, and artwork.",
    category: "GAMING"
  }
];

  /* ==========================================
     16. BUILD COMMUNITY INTERFACE
     ========================================== */

async function openCommunityAdmin(hub) {
  if (currentCommunityRole !== "admin") return;

  const existingPanel = $(".hub-admin-panel", hub);
  if (existingPanel) existingPanel.remove();

  const panel = document.createElement("div");
  panel.className = "hub-admin-panel";

  panel.style.cssText = `
    position: fixed;
    inset: 5%;
    z-index: 9999;
    background: #111;
    color: white;
    border: 1px solid #555;
    border-radius: 12px;
    padding: 24px;
    overflow-y: auto;
  `;

  const heading = document.createElement("h2");
  heading.textContent = "Community Administration";

  const description = document.createElement("p");
  description.textContent =
    "Manage moderators and community staff.";
   
   const announcementHeading = document.createElement("h3");
announcementHeading.textContent = "Community Announcements";

const announcementTitle = document.createElement("input");
announcementTitle.type = "text";
announcementTitle.placeholder = "Announcement title";

const announcementMessage = document.createElement("textarea");
announcementMessage.placeholder = "Write your announcement...";
announcementMessage.rows = 4;

const publishButton = document.createElement("button");
publishButton.type = "button";
publishButton.textContent = "Publish Announcement";

const announcementList = document.createElement("div");
announcementList.textContent = "Announcements will appear here.";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", () => panel.remove());

  const memberList = document.createElement("div");
   
panel.append(
  heading,
  description,
  closeButton,
  announcementHeading,
  announcementTitle,
  announcementMessage,
  publishButton,
  announcementList,
  memberList
);
  hub.appendChild(panel);
   async function loadAnnouncements() {
  announcementList.textContent = "Loading announcements...";

  try {
    const { data, error } = await supabaseClient
      .from("community_announcements")
      .select("id, title, message, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    announcementList.replaceChildren();

    if (!data || !data.length) {
      announcementList.textContent = "No announcements yet.";
      return;
    }

    data.forEach(item => {
      const entry = document.createElement("div");
      entry.style.cssText =
        "padding:12px 0;border-bottom:1px solid #444;";

      const title = document.createElement("h4");
      title.textContent = item.title;

      const message = document.createElement("p");
      message.textContent = item.message;

      const date = document.createElement("small");
      date.textContent =
        new Date(item.created_at).toLocaleString();

      entry.append(title, message, date);
      announcementList.appendChild(entry);
    });

  } catch (error) {
    console.error("Announcement loading error:", error);
    announcementList.textContent =
      "Could not load announcements.";
  }
}

loadAnnouncements();
   publishButton.addEventListener("click", async () => {
  const title = announcementTitle.value.trim();
  const message = announcementMessage.value.trim();

  if (!title || !message) {
    showStatus("Enter an announcement title and message.", true);
    return;
  }

  publishButton.disabled = true;

  try {
    const { error } = await supabaseClient
      .from("community_announcements")
      .insert({
        title: title,
        message: message,
        created_by: currentUser.id
      });

    if (error) throw error;

    announcementTitle.value = "";
    announcementMessage.value = "";

    showStatus("Announcement published!");

  } catch (error) {
    console.error("Announcement error:", error);
    showStatus(error.message || "Could not publish announcement.", true);

  } finally {
    publishButton.disabled = false;
  }
});

  memberList.textContent = "Loading community members...";

  try {
    const { data: staff, error } = await supabaseClient
      .from("community_staff")
      .select("user_id, role");

    if (error) throw error;
     
const { data: bans, error: banError } = await supabaseClient
  .from("community_bans")
  .select("user_id, reason");

if (banError) throw banError;
    memberList.replaceChildren();

    communityProfiles.forEach(profile => {
      if (profile.id === currentUser.id) return;

      const staffMember = staff.find(
        item => item.user_id === profile.id
      );
       
      const role = staffMember?.role || "member";
       
       const banRecord = bans.find(
  item => item.user_id === profile.id
);

      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #444;";

      const name = document.createElement("span");
      name.textContent =
        `${getUsername(profile)} — ${role}`;

      const action = document.createElement("button");
      action.type = "button";

      if (role === "moderator") {
        action.textContent = "Remove Moderator";
      } else {
        action.textContent = "Make Moderator";
      }

      action.addEventListener("click", async () => {
        action.disabled = true;

        try {
          const { error } = await supabaseClient.rpc(
            "manage_community_moderator",
            {
              p_user_id: profile.id,
              p_make_moderator: role !== "moderator"
            }
          );

          if (error) throw error;

          showStatus(
            role === "moderator"
              ? "Moderator permissions removed."
              : "Member promoted to moderator."
          );

          panel.remove();
          openCommunityAdmin(hub);

        } catch (error) {
          console.error("Staff management error:", error);
          showStatus(error.message, true);
          action.disabled = false;
        }
      });

      const banButton = document.createElement("button");
banButton.type = "button";

banButton.textContent = banRecord
  ? "Unban Member"
  : "Ban Member";

banButton.addEventListener("click", async () => {
  const enteredReason = banRecord
    ? ""
    : prompt(`Reason for banning ${getUsername(profile)}?`);

  if (!banRecord && enteredReason === null) return;

  const confirmed = confirm(
    banRecord
      ? `Unban ${getUsername(profile)}?`
      : `Ban ${getUsername(profile)} from posting public community messages?`
  );

  if (!confirmed) return;

  banButton.disabled = true;

  try {
    const { error } = await supabaseClient.rpc(
      "manage_community_ban",
      {
        p_user_id: profile.id,
        p_ban: !banRecord,
        p_reason: enteredReason || ""
      }
    );

    if (error) throw error;

    showStatus(
      banRecord ? "Member unbanned." : "Member banned."
    );

    panel.remove();
    await openCommunityAdmin(hub);

  } catch (error) {
    console.error("Member ban error:", error);
    showStatus(error.message, true);
    banButton.disabled = false;
  }
});

       row.append(name, action, banButton);
       memberList.appendChild(row);
    });

    if (!communityProfiles.length) {
      memberList.textContent = "No community members found.";
    }

  } catch (error) {
    console.error("Community administration error:", error);
    memberList.textContent =
      "Could not load community members.";
  }
}
   
  function initializeCommunity() {
    const section = $("#community");

    if (!section || $(".community-hub", section)) return;

    const hub = document.createElement("div");
    hub.className = "community-hub";

    hub.innerHTML = `
      <aside class="hub-sidebar">

        <div class="hub-server-name">NOCTURNE VOID</div>

        <div class="hub-profile-card">
          <div class="hub-profile-preview"></div>

          <div class="hub-profile-details">
            <strong class="hub-profile-username">Guest</strong>

            <button
              class="hub-avatar-upload-button"
              type="button"
              disabled
            >
              Sign in to upload
            </button>

            <input
              class="hub-avatar-file-input"
              type="file"
              accept="image/png,image/jpeg"
              hidden
            >
          </div>
        </div>

        <div class="hub-admin-area" hidden>
  <div class="hub-category">ADMINISTRATION</div>
  <button class="hub-admin-button" type="button">
    Manage Community
  </button>
</div>
        <div class="hub-category">COMMUNITY CHANNELS</div>
        <div class="hub-channels"></div>

        <div class="hub-category hub-dm-category">
          PRIVATE MESSAGES
        </div>

        <button class="hub-inbox-button" type="button">
          <span>✉</span>
          <span>Inbox</span>
          <span class="hub-inbox-count" hidden></span>
        </button>

        <div class="hub-conversation-list"></div>

      </aside>

      <main class="hub-main">

        <header class="hub-header">
          <div class="hub-header-title">
            <h3 class="hub-channel-title"># general</h3>
            <p class="hub-channel-description"></p>
          </div>

          <button class="hub-back-button" type="button" hidden>
            ← Channels
          </button>
        </header>

        <div class="hub-messages" aria-live="polite"></div>

        <form class="hub-composer">
          <input
            class="hub-message-input"
            type="text"
            maxlength="1000"
            placeholder="Sign in to send a message..."
            aria-label="Write a message"
          >

          <button type="submit">Send</button>
        </form>

      </main>

      <aside class="hub-members">
        <h4>MEMBERS</h4>
        <div class="hub-member-list"></div>
      </aside>
    `;

    section.appendChild(hub);
     const announcementFeed = document.createElement("div");
announcementFeed.className = "hub-announcement-feed";

announcementFeed.style.cssText = `
  padding: 12px 16px;
  margin: 10px;
  background: #181818;
  border: 1px solid #555;
  border-radius: 8px;
`;

const announcementFeedTitle = document.createElement("h3");
announcementFeedTitle.textContent = "COMMUNITY ANNOUNCEMENTS";

const announcementFeedList = document.createElement("div");

announcementFeed.append(
  announcementFeedTitle,
  announcementFeedList
);

const communityMain = $(".hub-main", hub);

if (communityMain) {
  communityMain.prepend(announcementFeed);
}
     async function loadPublicAnnouncements() {
  announcementFeedList.textContent = "Loading announcements...";

  try {
    const { data, error } = await supabaseClient
      .from("community_announcements")
      .select("id, title, message, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    announcementFeedList.replaceChildren();

    if (!data || !data.length) {
      announcementFeedList.textContent =
        "No announcements yet.";
      return;
    }

    data.forEach(item => {
      const entry = document.createElement("div");
      entry.style.cssText =
        "padding:10px 0;border-bottom:1px solid #444;";

      const title = document.createElement("h4");
      title.textContent = item.title;

      const message = document.createElement("p");
      message.textContent = item.message;

      const date = document.createElement("small");
      date.textContent =
        new Date(item.created_at).toLocaleString();

      entry.append(title, message, date);
      announcementFeedList.appendChild(entry);
    });

  } catch (error) {
    console.error("Public announcement error:", error);
    announcementFeedList.textContent =
      "Could not load announcements.";
  }
}

loadPublicAnnouncements();
     const adminArea = $(".hub-admin-area", hub);

if (adminArea && currentCommunityRole === "admin") {
  adminArea.hidden = false;
}
   const adminButton = $(".hub-admin-button", hub);

adminButton?.addEventListener("click", () => {
   openCommunityAdmin(hub);
});
    installAvatarStyles();
    setupNotificationSoundToggle(hub);

    const avatarButton =
      $(".hub-avatar-upload-button", hub);

    const avatarInput =
      $(".hub-avatar-file-input", hub);

    avatarButton?.addEventListener("click", () => {
      if (!currentUser) {
        openAccountDialog();
        setAuthMode("login");
        return;
      }

      avatarInput?.click();
    });
   
    avatarInput?.addEventListener(
      "change",
      handleAvatarUpload
    );

    renderAvatarProfile();
    renderCommunityChannels();
    renderCommunityMessages();
    renderCommunityMembers();
    renderDirectMessageInbox();

    $(".hub-composer", hub)?.addEventListener(
      "submit",
      handleComposerSubmit
    );

    $(".hub-inbox-button", hub)?.addEventListener("click", () => {
      showInboxView();
    });

    $(".hub-back-button", hub)?.addEventListener("click", () => {
      showChannelView();
    });
  }

  /* ==========================================
     17. CHANNEL NAVIGATION
     ========================================== */


function renderCommunityChannels() {
  const container = $(".hub-channels");
  if (!container) return;

  container.replaceChildren();

  const categories = new Map();

  channels.forEach(channel => {
    const category = channel.category || "CHANNELS";

    if (!categories.has(category)) {
      categories.set(category, []);
    }

    categories.get(category).push(channel);
  });

  categories.forEach((categoryChannels, categoryName) => {
    const heading = document.createElement("div");
    heading.className = "hub-channel-category";
    heading.textContent = categoryName;

    container.appendChild(heading);

    categoryChannels.forEach(channel => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "hub-channel";
      button.dataset.channel = channel.id;

      button.classList.toggle(
        "active",
        activeView === "channel" &&
        channel.id === activeChannel
      );

      const icon = document.createElement("span");
      icon.textContent = "#";

      const label = document.createElement("span");
      label.textContent = channel.name;

      button.append(icon, label);

      button.addEventListener("click", () => {
        activeChannel = channel.id;
        showChannelView();
        loadCommunityMessages();
      });

      container.appendChild(button);
    });
  });

  const active = channels.find(
    channel => channel.id === activeChannel
  );

  const title = $(".hub-channel-title");
  const description = $(".hub-channel-description");

  if (activeView === "channel" && active) {
    if (title) {
      title.textContent = `# ${active.name.toLowerCase()}`;
    }

    if (description) {
      description.textContent = active.description;
    }
  }
}


  function showChannelView() {
    activeView = "channel";
    activeConversation = null;

    const composer = $(".hub-composer");
    const back = $(".hub-back-button");
    const inbox = $(".hub-inbox-button");

    if (composer) composer.hidden = false;
    if (back) back.hidden = true;

    if (inbox) {
      inbox.classList.remove("active");
    }

    renderCommunityChannels();
    renderCommunityMessages();

    const input = $(".hub-message-input");

    if (input) {
      input.placeholder = currentUser
        ? "Write a message..."
        : "Sign in to send a message...";
    }

    stopDirectMessageSubscription();

    if (currentUser) {
      subscribeToDirectMessages();
    }
  }

  /* ==========================================
     18. PLAYER PROFILE LOADING
     ========================================== */

  async function loadCurrentProfile() {
    if (!currentUser || !supabaseClient) return;

    const userId = currentUser.id;

    try {
      const { data, error } = await supabaseClient
        .from("community_profiles")
        .select("id, username, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      // Ignore outdated profile requests.
      if (!currentUser || currentUser.id !== userId) return;

      currentProfile = data;

      if (data) {
        communityProfiles = [
          ...communityProfiles.filter(
            profile => profile.id !== data.id
          ),
          data
        ];
      }

      renderAvatarProfile();
      renderCommunityMembers();
      renderCommunityMessages();
      renderDirectMessageInbox();

    } catch (error) {
      console.error("Profile loading error:", error);
    }
  }
   
async function loadCommunityStaffRole() {
  currentCommunityRole = null;

  if (!supabaseClient || !currentUser) return;

  try {
    const { data, error } = await supabaseClient
      .from("community_staff")
      .select("role")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) throw error;

    currentCommunityRole = data?.role || null;
     const adminArea = $(".hub-admin-area");

if (adminArea) {
  adminArea.hidden = currentCommunityRole !== "admin";
}

  } catch (error) {
    console.error("Staff role loading error:", error);
  }
}

  async function loadCommunityProfiles() {
     await loadCommunityStaffRole();
    if (!supabaseClient) return;

    const userId = currentUser?.id;

    try {
      const { data, error } = await supabaseClient
        .from("community_profiles")
        .select("id, username, avatar_url")
        .order("username", { ascending: true });

      if (error) throw error;

      if (userId && currentUser?.id !== userId) return;

      communityProfiles = data || [];

      // Preserve the latest local profile while the list loads.
      if (currentProfile) {
        communityProfiles = [
          ...communityProfiles.filter(
            profile => profile.id !== currentProfile.id
          ),
          currentProfile
        ];
      }

      renderAvatarProfile();
      renderCommunityMembers();
      renderCommunityMessages();
      renderDirectMessageInbox();

    } catch (error) {
      console.error("Community member loading error:", error);
    }
  }

  /* ==========================================
     19. MEMBER LIST
     ========================================== */

  function renderCommunityMembers() {
    const container = $(".hub-member-list");
    if (!container) return;

    container.replaceChildren();

    if (!currentUser) {
      const message = document.createElement("div");
      message.className = "hub-empty";
      message.textContent = "Sign in to join the community.";

      container.appendChild(message);
      return;
    }

    if (!communityProfiles.length) {
      const message = document.createElement("div");
      message.className = "hub-empty";
      message.textContent = "No members found yet.";

      container.appendChild(message);
      return;
    }

    communityProfiles.forEach(profile => {
      if (profile.id === currentUser.id) return;

      const member = document.createElement("button");

      member.type = "button";
      member.className = "hub-member hub-member-button";
      member.title = `Send a private message to ${getUsername(profile)}`;

      const avatar = document.createElement("span");
      avatar.className = "hub-member-avatar";

      if (profile.avatar_url) {
        const image = document.createElement("img");

        image.src = profile.avatar_url;
        image.alt = "";
        image.loading = "lazy";

        image.onerror = () => {
          image.remove();
          avatar.textContent = getInitial(getUsername(profile));
        };

        avatar.appendChild(image);

      } else {
        avatar.textContent = getInitial(getUsername(profile));
      }

      const name = document.createElement("span");
      name.className = "hub-member-name";
      name.textContent = getUsername(profile);

      const dot = document.createElement("span");
      dot.className = "hub-online-dot";

      const isOnline = onlineMembers.has(profile.id);

      dot.classList.toggle("is-online", isOnline);
      dot.title = isOnline ? "Online" : "Offline";

      member.append(avatar, name, dot);

      member.addEventListener("click", () => {
        openDirectMessage(profile);
      });

      container.appendChild(member);
    });
  }

  /* ==========================================
     20. ONLINE PRESENCE
     ========================================== */

  function stopPresence() {
    if (presenceSubscription && supabaseClient) {
      supabaseClient.removeChannel(presenceSubscription);
    }

    presenceSubscription = null;
    onlineMembers.clear();
  }

  async function startPresence() {
    if (!currentUser || !supabaseClient || !$("#community")) {
      return;
    }

    stopPresence();

    const userId = currentUser.id;

    const channel = supabaseClient.channel(
      "nocturne-void-presence",
      {
        config: {
          presence: { key: userId }
        }
      }
    );

    presenceSubscription = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();

        onlineMembers = new Set(Object.keys(state));

        renderCommunityMembers();
      })
      .subscribe(async status => {
        if (
          status === "SUBSCRIBED" &&
          currentUser?.id === userId
        ) {
          await channel.track({
            user_id: userId,
            username: getUsername(currentProfile || currentUser)
          });
        }
      });
  }

  /* ==========================================
     21. PUBLIC COMMUNITY MESSAGES
     ========================================== */

  async function loadCommunityMessages() {
    if (!supabaseClient) return;

    const container = $(".hub-messages");

    if (!container || activeView !== "channel") return;

    const requestedChannel = activeChannel;

    container.textContent = "Loading messages...";

    try {
      const { data, error } = await supabaseClient
        .from("community_messages")
        .select("id, user_id, username, message, channel, created_at")
        .eq("channel", requestedChannel)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      if (
        activeView !== "channel" ||
        activeChannel !== requestedChannel
      ) return;

      communityMessages = data || [];

      renderCommunityMessages();
      subscribeToCommunityMessages();

    } catch (error) {
      console.error("Message loading error:", error);

      container.textContent =
        "Unable to load messages. Please refresh the page.";
    }
  }

  function stopCommunitySubscriptions() {
    if (communitySubscription && supabaseClient) {
      supabaseClient.removeChannel(communitySubscription);
    }

    communitySubscription = null;
  }

  function subscribeToCommunityMessages() {
    if (!supabaseClient || !currentUser) return;

    stopCommunitySubscriptions();

    const channelName = activeChannel;

    communitySubscription = supabaseClient
      .channel(`nocturne-community-${channelName}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_messages",
          filter: `channel=eq.${channelName}`
        },
        payload => {
          if (activeChannel !== channelName) return;

          if (payload.eventType === "INSERT") {
            const incoming = payload.new;

            if (incoming.user_id !== currentUser?.id) {
              playNotificationSound("public");
            }

            if (
              !communityMessages.some(
                item => item.id === incoming.id
              )
            ) {
              communityMessages.push(incoming);

              communityMessages =
                communityMessages.slice(-100);

              renderCommunityMessages();
            }
          }

          if (payload.eventType === "DELETE") {
            communityMessages = communityMessages.filter(
              item => item.id !== payload.old.id
            );

            renderCommunityMessages();
          }
        }
      )
      .subscribe();
  }
async function editCommunityMessage(message) {
  if (!currentUser || message.user_id !== currentUser.id) return;

  const updatedMessage = prompt(
    "Edit your message:",
    message.message
  );

  if (updatedMessage === null) return;

  const newText = updatedMessage.trim();

  if (!newText) {
    showStatus("A message cannot be empty.", true);
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("community_messages")
      .update({ message: newText })
      .eq("id", message.id)
      .eq("user_id", currentUser.id)
      .select("id, user_id, username, message, channel, created_at");

    if (error) throw error;

    if (!data || !data.length) {
      throw new Error("Message could not be updated.");
    }

    communityMessages = communityMessages.map(item =>
      item.id === message.id ? data[0] : item
    );

    renderCommunityMessages();
    showStatus("Message updated.");

  } catch (error) {
    console.error("Message editing error:", error);
    showStatus(error.message || "Could not edit message.", true);
  }
}


async function deleteCommunityMessage(message) {
  const isOwnMessage =
    currentUser && message.user_id === currentUser.id;

  const canModerateMessages =
    currentCommunityRole === "admin" ||
    currentCommunityRole === "moderator";

  if (!currentUser || (!isOwnMessage && !canModerateMessages)) return;

  if (!confirm("Are you sure you want to delete this message?")) {
    return;
  }

  try {
    let query = supabaseClient
      .from("community_messages")
      .delete()
      .eq("id", message.id);

    if (!canModerateMessages) {
      query = query.eq("user_id", currentUser.id);
    }

    const { data, error } = await query.select("id");

    if (error) throw error;

    if (!data || !data.length) {
      throw new Error("Message could not be deleted.");
    }

    communityMessages = communityMessages.filter(
      item => item.id !== message.id
    );

    renderCommunityMessages();
    showStatus("Message deleted.");

  } catch (error) {
    console.error("Message deletion error:", error);
    showStatus(error.message || "Could not delete message.", true);
  }
}

  function renderCommunityMessages() {
    const container = $(".hub-messages");

    if (!container || activeView !== "channel") return;

    container.replaceChildren();

    if (!communityMessages.length) {
      const welcome = document.createElement("div");

      welcome.className = "hub-welcome";

      welcome.textContent =
        "Welcome to this channel. Be respectful, meet other players, and enjoy your time in Nocturne Void.";

      container.appendChild(welcome);
      return;
    }

    communityMessages.forEach(message => {
      const row = document.createElement("div");
      row.className = "hub-message";

      const profile = getProfile(message.user_id);

      const avatar = makeAvatar(
        profile || { username: message.username },
        "hub-avatar"
      );

      const content = document.createElement("div");
      content.className = "hub-message-content";

      const top = document.createElement("div");
      top.className = "hub-message-top";

      const name = document.createElement("span");
      name.className = "hub-message-name";
      name.textContent = message.username;

      const time = document.createElement("span");
      time.className = "hub-message-time";
      time.textContent = formatDate(message.created_at);

      const text = document.createElement("div");
      text.className = "hub-message-text";
      text.textContent = message.message;

    
top.append(name, time);

content.append(top, text);


const isOwnMessage =
  currentUser && message.user_id === currentUser.id;

const canModerateMessages =
  currentCommunityRole === "admin" ||
  currentCommunityRole === "moderator";

if (isOwnMessage || canModerateMessages) {
  const actions = document.createElement("div");
  actions.className = "hub-message-actions";

  if (isOwnMessage) {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      editCommunityMessage(message);
    });

    actions.appendChild(editButton);
  }

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => {
    deleteCommunityMessage(message);
  });

  actions.appendChild(deleteButton);
  content.appendChild(actions);
}

row.append(avatar, content);


      container.appendChild(row);
    });

    container.scrollTop = container.scrollHeight;
  }

  /* ==========================================
     22. SEND PUBLIC MESSAGE
     ========================================== */

  async function handleCommunityMessage(event) {
    event.preventDefault();

    const input = $(".hub-message-input");
    const submit = $(".hub-composer button");

    if (!input || !supabaseClient || !currentUser) {
      openAccountDialog();
      setAuthMode("login");

      showStatus(
        "Please sign in before sending a message."
      );

      return;
    }

    const messageText = input.value.trim();

    if (!messageText) return;

    if (messageText.length > 1000) {
      showStatus(
        "Messages cannot exceed 1000 characters.",
        true
      );
      return;
    }

    const username = getUsername(currentProfile || currentUser);

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Sending...";
    }

    try {
      const { error } = await supabaseClient
        .from("community_messages")
        .insert({
          user_id: currentUser.id,
          username,
          message: messageText,
          channel: activeChannel
        });

      if (error) throw error;

      input.value = "";

    } catch (error) {
      console.error("Message sending error:", error);

      showStatus(
        error.message || "Your message could not be sent.",
        true
      );

    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Send";
      }
    }
  }

  /* ==========================================
     23. PRIVATE MESSAGE INBOX
     ========================================== */

  async function loadDirectMessageInbox() {
    if (!currentUser || !supabaseClient) return;

    const userId = currentUser.id;

    try {
      const { data, error } = await supabaseClient
        .from("direct_messages")
        .select("id, sender_id, recipient_id, message, created_at")
        .or(
          `sender_id.eq.${userId},recipient_id.eq.${userId}`
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      if (currentUser?.id !== userId) return;

      directMessages = data || [];

      const otherIds = [
        ...new Set(
          directMessages.map(message =>
            message.sender_id === userId
              ? message.recipient_id
              : message.sender_id
          )
        )
      ];

      conversationProfiles = communityProfiles.filter(profile =>
        otherIds.includes(profile.id)
      );

      renderDirectMessageInbox();

    } catch (error) {
      console.error("Private inbox loading error:", error);
      showInboxError(error);
    }
  }

  function showInboxError(error) {
    const list = $(".hub-conversation-list");
    if (!list) return;

    list.replaceChildren();

    const message = document.createElement("div");

    message.className = "hub-empty";

    message.textContent =
      "Your inbox could not load. Check your private message table permissions.";

    list.appendChild(message);

    console.error(error);
  }

  function renderDirectMessageInbox() {
    const list = $(".hub-conversation-list");
    if (!list) return;

    list.replaceChildren();

    if (!currentUser) {
      const empty = document.createElement("div");

      empty.className = "hub-empty";
      empty.textContent = "Sign in to use private messages.";

      list.appendChild(empty);
      return;
    }

    const latestByUser = new Map();

    directMessages.forEach(message => {
      const otherId =
        message.sender_id === currentUser.id
          ? message.recipient_id
          : message.sender_id;

      if (!latestByUser.has(otherId)) {
        latestByUser.set(otherId, message);
      }
    });

    if (!latestByUser.size) {
      const empty = document.createElement("div");

      empty.className = "hub-empty";

      empty.textContent =
        "No conversations yet. Select a member to message them.";

      list.appendChild(empty);
      return;
    }

    latestByUser.forEach((message, userId) => {
      const profile = getProfile(userId);
      if (!profile) return;

      const button = document.createElement("button");

      button.type = "button";
      button.className = "hub-conversation-button";

      if (activeConversation?.id === userId) {
        button.classList.add("active");
      }

      const avatar = makeAvatar(
        profile,
        "hub-member-avatar"
      );

      const details = document.createElement("span");
      details.className = "hub-conversation-details";

      const name = document.createElement("strong");
      name.textContent = getUsername(profile);

      const preview = document.createElement("small");

      const prefix =
        message.sender_id === currentUser.id
          ? "You: "
          : "";

      preview.textContent = prefix + message.message;

      details.append(name, preview);
      button.append(avatar, details);

      button.addEventListener("click", () => {
        openDirectMessage(profile);
      });

      list.appendChild(button);
    });
  }

  /* ==========================================
     24. INBOX VIEW
     ========================================== */

  function showInboxView() {
    if (!currentUser) {
      openAccountDialog();
      setAuthMode("login");

      showStatus("Sign in to use private messages.");
      return;
    }

    activeView = "inbox";
    activeConversation = null;

    stopDirectMessageSubscription();

    const title = $(".hub-channel-title");
    const description = $(".hub-channel-description");
    const messages = $(".hub-messages");
    const composer = $(".hub-composer");
    const back = $(".hub-back-button");
    const inbox = $(".hub-inbox-button");

    if (title) title.textContent = "Private Messages";

    if (description) {
      description.textContent = "Your personal conversations.";
    }

    if (composer) composer.hidden = true;
    if (back) back.hidden = false;
    if (inbox) inbox.classList.add("active");

    if (messages) {
      messages.replaceChildren();

      const welcome = document.createElement("div");

      welcome.className = "hub-welcome";

      welcome.textContent =
        "Choose a conversation from your inbox, or select a member to start a new private conversation.";

      messages.appendChild(welcome);
    }

    renderCommunityChannels();
    renderDirectMessageInbox();
  }

  /* ==========================================
     25. OPEN PRIVATE CONVERSATION
     ========================================== */

  async function openDirectMessage(profile) {
    if (!currentUser) {
      openAccountDialog();
      setAuthMode("login");

      showStatus("Sign in to send private messages.");
      return;
    }

    if (!profile || profile.id === currentUser.id) return;

    activeView = "dm";
    activeConversation = profile;

    const title = $(".hub-channel-title");
    const description = $(".hub-channel-description");
    const composer = $(".hub-composer");
    const back = $(".hub-back-button");
    const inbox = $(".hub-inbox-button");
    const input = $(".hub-message-input");

    if (title) {
      title.textContent = getUsername(profile);
    }

    if (description) {
      description.textContent = "Private conversation";
    }

    if (composer) composer.hidden = false;
    if (back) back.hidden = false;

    if (inbox) {
      inbox.classList.remove("active");
    }

    if (input) {
      input.placeholder =
        `Message ${getUsername(profile)} privately...`;

      input.value = "";
    }

    renderCommunityChannels();
    renderDirectMessageInbox();

    await loadConversationMessages(profile.id);
  }

  /* ==========================================
     26. LOAD PRIVATE CONVERSATION
     ========================================== */

  async function loadConversationMessages(otherUserId) {
    if (!currentUser || !supabaseClient || !otherUserId) return;

    const container = $(".hub-messages");
    if (!container) return;

    const userId = currentUser.id;

    container.textContent = "Loading private messages...";

    try {
      const me = userId;
      const other = otherUserId;

      const { data, error } = await supabaseClient
        .from("direct_messages")
        .select("id, sender_id, recipient_id, message, created_at")
        .or(
          `and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`
        )
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;

      if (
        currentUser?.id !== userId ||
        activeView !== "dm" ||
        activeConversation?.id !== otherUserId
      ) return;

      directMessages = [
        ...directMessages.filter(message =>
          message.sender_id !== otherUserId &&
          message.recipient_id !== otherUserId
        ),
        ...(data || [])
      ];

      renderDirectConversation(data || []);
      subscribeToDirectMessages();

    } catch (error) {
      console.error("Conversation loading error:", error);

      container.textContent =
        "Unable to load this conversation. Check your direct_messages table and permissions.";
    }
  }

  function renderDirectConversation(messages) {
    const container = $(".hub-messages");

    if (!container || activeView !== "dm") return;

    container.replaceChildren();

    if (!messages.length) {
      const empty = document.createElement("div");

      empty.className = "hub-welcome";

      empty.textContent =
        `This is the beginning of your private conversation with ${getUsername(activeConversation)}.`;

      container.appendChild(empty);
      return;
    }

    messages.forEach(message => {
      const mine = message.sender_id === currentUser.id;

      const row = document.createElement("div");

      row.className = mine
        ? "hub-message hub-message-mine"
        : "hub-message";

      row.dataset.messageId = String(message.id);

      const otherProfile = mine
        ? currentProfile || currentUser
        : activeConversation;

      const avatar = makeAvatar(
        otherProfile,
        "hub-avatar"
      );

      const content = document.createElement("div");
      content.className = "hub-message-content";

      const top = document.createElement("div");
      top.className = "hub-message-top";

      const name = document.createElement("span");
      name.className = "hub-message-name";

      name.textContent = mine
        ? "You"
        : getUsername(activeConversation);

      const time = document.createElement("span");
      time.className = "hub-message-time";
      time.textContent = formatDate(message.created_at);

      const text = document.createElement("div");
      text.className = "hub-message-text";
      text.textContent = message.message;

      top.append(name, time);
      content.append(top, text);
      row.append(avatar, content);

      container.appendChild(row);
    });

    container.scrollTop = container.scrollHeight;
  }

  /* ==========================================
     27. REAL-TIME PRIVATE MESSAGES
     ========================================== */

  function stopDirectMessageSubscription() {
    if (directMessageSubscription && supabaseClient) {
      supabaseClient.removeChannel(
        directMessageSubscription
      );
    }

    directMessageSubscription = null;
  }

  function subscribeToDirectMessages() {
    if (!supabaseClient || !currentUser) return;

    stopDirectMessageSubscription();

    const userId = currentUser.id;

    directMessageSubscription = supabaseClient
      .channel(`nocturne-dm-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `sender_id=eq.${userId}`
        },
        handleIncomingDirectMessage
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `recipient_id=eq.${userId}`
        },
        handleIncomingDirectMessage
      )
      .subscribe(status => {
        if (status === "CHANNEL_ERROR") {
          console.error(
            "Private message realtime subscription failed."
          );
        }
      });
  }

  function handleIncomingDirectMessage(payload) {
    const incoming = payload.new;

    if (!incoming || !currentUser) return;

    if (incoming.sender_id !== currentUser.id) {
      playNotificationSound("private");
    }

    if (
      !directMessages.some(
        message => message.id === incoming.id
      )
    ) {
      directMessages.unshift(incoming);
    }

    renderDirectMessageInbox();

    if (activeView !== "dm" || !activeConversation) return;

    const otherId = activeConversation.id;

    const belongsToConversation =
      (incoming.sender_id === currentUser.id &&
        incoming.recipient_id === otherId) ||
      (incoming.sender_id === otherId &&
        incoming.recipient_id === currentUser.id);

    if (!belongsToConversation) return;

    const container = $(".hub-messages");
    if (!container) return;

    const existing = $$(".hub-message", container).some(row =>
      row.dataset.messageId === String(incoming.id)
    );

    if (!existing) {
      const currentMessages = directMessages
        .filter(message =>
          (message.sender_id === currentUser.id &&
            message.recipient_id === otherId) ||
          (message.sender_id === otherId &&
            message.recipient_id === currentUser.id)
        )
        .sort((a, b) =>
          new Date(a.created_at) - new Date(b.created_at)
        );

      renderDirectConversation(currentMessages);
    }
  }

  /* ==========================================
     28. SEND PRIVATE MESSAGE
     ========================================== */

  async function handleDirectMessage(event) {
    event.preventDefault();

    const input = $(".hub-message-input");
    const submit = $(".hub-composer button");

    if (!currentUser) {
      openAccountDialog();
      setAuthMode("login");

      showStatus("Sign in to send private messages.");
      return;
    }

    if (!activeConversation || !input || !supabaseClient) {
      return;
    }

    const messageText = input.value.trim();

    if (!messageText) return;

    if (messageText.length > 1000) {
      showStatus(
        "Messages cannot exceed 1000 characters.",
        true
      );
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Sending...";
    }

    try {
      const { data, error } = await supabaseClient
        .from("direct_messages")
        .insert({
          sender_id: currentUser.id,
          recipient_id: activeConversation.id,
          message: messageText
        })
        .select("id, sender_id, recipient_id, message, created_at")
        .single();

      if (error) throw error;

      input.value = "";

      if (data) {
        if (
          !directMessages.some(item => item.id === data.id)
        ) {
          directMessages.unshift(data);
        }

        const currentMessages = directMessages
          .filter(message =>
            (message.sender_id === currentUser.id &&
              message.recipient_id === activeConversation.id) ||
            (message.sender_id === activeConversation.id &&
              message.recipient_id === currentUser.id)
          )
          .sort((a, b) =>
            new Date(a.created_at) - new Date(b.created_at)
          );

        renderDirectConversation(currentMessages);
        renderDirectMessageInbox();
      }

    } catch (error) {
      console.error("Private message sending error:", error);

      showStatus(
        error.message || "Your private message could not be sent.",
        true
      );

    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Send";
      }
    }
  }

  /* ==========================================
     29. MESSAGE COMPOSER ROUTER
     ========================================== */

  function handleComposerSubmit(event) {
    if (activeView === "dm") {
      handleDirectMessage(event);

    } else if (activeView === "channel") {
      handleCommunityMessage(event);

    } else {
      event.preventDefault();
    }
  }

  /* ==========================================
     30. MOBILE NAVIGATION
     ========================================== */

  function initializeMobileNavigation() {
    const toggle = $("#menuToggle");
    const nav = $("#mainNav");

    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");

      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "✕" : "☰";
    });

    $$("#mainNav a").forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");

        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "☰";
      });
    });
  }

  /* ==========================================
     31. FOOTER
     ========================================== */

  function initializeFooter() {
    const year = new Date().getFullYear();

    setText("year", year);
    setText("footerYear", year);
  }

  /* ==========================================
     32. START WEBSITE
     ========================================== */

  function initializeWebsite() {
    initializeGameLibrary();
    renderLeaderboard();

    initializeAccountButtons();

connectSupabase();

initializeCommunity();

initializeMobileNavigation();
initializeFooter();

    console.log(
      "NOCTURNE VOID initialized successfully."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeWebsite
    );
  } else {
    initializeWebsite();
  }

})();
