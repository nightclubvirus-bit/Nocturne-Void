
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

   let mainNotificationBell = null;
let mainNotificationCount = null;
let mainNotificationPanel = null;
let mainNotificationList = null;

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
   function updatePersistentPlayerProfile() {
  const avatarContainer =
    $("#persistentPlayerAvatar");

  const name =
    $("#persistentPlayerName");

  const status =
    $("#persistentPlayerStatus");

  const profile =
    currentProfile || currentUser;

  if (avatarContainer) {
    avatarContainer.replaceChildren(
      makeAvatar(
        profile || { username: "Guest" }
      )
    );
  }

  if (name) {
    name.textContent = currentUser
      ? getUsername(profile)
      : "Guest";
  }

  if (status) {
    if (!currentUser) {
      status.textContent = "Not signed in";
    } else {
      status.textContent =
        currentProfile?.custom_status ||
        currentProfile?.presence_status ||
        "Online";
    }
  }
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
   const usernameButton = 
      $(".hub-username-edit-button", hub);

     const aboutPreview = $(".hub-about-preview", hub);

if (aboutPreview) {
  aboutPreview.textContent =
    currentProfile?.about_me || "Add something about yourself...";
}

if (usernameButton) {
  usernameButton.disabled = !currentUser;
}
     const aboutEditButton =
  $(".hub-about-edit-button", hub);

if (aboutEditButton) {
  aboutEditButton.disabled = !currentUser;
}
         const customStatusButton =
      $(".hub-custom-status-button", hub);

    if (customStatusButton) {
      customStatusButton.disabled = !currentUser;

      customStatusButton.textContent =
        currentProfile?.custom_status
          ? "Edit Custom Status"
          : "Set Custom Status";
    }

     const presenceSelect =
  $(".hub-presence-select", hub);

if (presenceSelect) {
  presenceSelect.disabled = !currentUser;

  presenceSelect.value =
    currentProfile?.presence_status || "online";
}

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
        : "Guest"
    }
     
   if (username) {
  let presenceLabel =
    $(".hub-presence-indicator", hub);

  if (!currentUser) {
    presenceLabel?.remove();
  } else {
    if (!presenceLabel) {
      presenceLabel = document.createElement("span");
      presenceLabel.className = "hub-presence-indicator";
      username.insertAdjacentElement("afterend", presenceLabel);
    }

    const presence = currentProfile?.presence_status || "online";

    const presenceLabels = {
      online: "🟢 Online",
      idle: "🌙 Idle",
      dnd: "⛔ Do Not Disturb",
      invisible: "⚫ Invisible"
    };

    presenceLabel.textContent =
      presenceLabels[presence] || "🟢 Online";
  }
}
     updatePersistentPlayerProfile();
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

  if (notificationAudioContext.state === "suspended") {
    notificationAudioContext.resume().catch(() => {});
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
  }

  function unlockNotificationAudio() {
  if (!notificationAudioContext) {
    initializeNotificationAudio();
  }

  if (
    notificationAudioContext &&
    notificationAudioContext.state === "suspended"
  ) {
    notificationAudioContext.resume().catch(console.warn);
  }
}

document.addEventListener(
  "pointerdown",
  unlockNotificationAudio
);

document.addEventListener(
  "keydown",
  unlockNotificationAudio
);
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
     image: "https://cdn.akamai.steamstatic.com/steam/apps/2124490/header.jpg",
   url: "https://store.steampowered.com/app/2124490/SILENT_HILL_2/"
    },
    {
      title: "Elden Ring",
      category: "Adventure",
      description: "Explore a mysterious world filled with ancient secrets and powerful enemies.",
      platform: "PC / Console",
     image: "https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg",
      url: "https://store.steampowered.com/app/1245620/ELDEN_RING/"
    },
    {
      title: "Resident Evil",
      category: "Horror",
      description: "Survive terrifying encounters in a world where danger waits around every corner.",
      platform: "PC / Console",
   image: "https://cdn.akamai.steamstatic.com/steam/apps/304240/header.jpg",
      url: "https://store.steampowered.com/franchise/residentevil"
    },
    {
      title: "Dark Souls III",
      category: "Action",
      description: "Face unforgiving challenges in a dark fantasy world.",
      platform: "PC / Console",
      image: "https://cdn.akamai.steamstatic.com/steam/apps/374320/header.jpg",
      url: "https://store.steampowered.com/app/374320/DARK_SOULS_III/"
    },
    {
      title: "The Witcher 3",
      category: "Adventure",
      description: "Discover a vast fantasy world filled with monsters, magic, and choices.",
      platform: "PC / Console",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg",
      url: "https://store.steampowered.com/app/292030/The_Witcher_3_Wild_Hunt/"
    },
    {
      title: "Dead by Daylight",
      category: "Horror",
      description: "Escape the nightmare or become the thing everyone fears.",
      platform: "PC / Console",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/381210/header.jpg",
      url: "https://store.steampowered.com/app/381210/Dead_by_Daylight/"
    },
    {
      title: "THE HOLLOW",
      category: "Horror",
      description: "Something is waiting inside the abandoned hospital. Find the key. Reach the exit. Do not let it find you.",
      platform: "Browser · Original NV Game",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80",
      original: true
    },
     {
      title: "Outlast",
      category: "Horror",
      description: "Investigate an abandoned asylum filled with terrifying secrets.",
      platform: "PC / Console",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/238320/header.jpg",
      url: "https://store.steampowered.com/app/238320/Outlast/"
    },
    {
      title: "Phasmophobia",
      category: "Horror",
      description: "Investigate haunted locations and identify dangerous spirits.",
      platform: "PC / Console",
      image: "https://cdn.akamai.steamstatic.com/steam/apps/739630/header.jpg",
      url: "https://store.steampowered.com/app/739630/Phasmophobia/"
    },
    {
      title: "Hollow Knight",
      category: "Adventure",
      description: "Explore a mysterious kingdom beneath the surface.",
      platform: "PC / Console",
     image: "https://cdn.akamai.steamstatic.com/steam/apps/367520/header.jpg",
      url: "https://store.steampowered.com/app/367520/Hollow_Knight/"
    },
    {
      title: "Cyberpunk 2077",
      category: "Adventure",
      description: "Explore a futuristic city filled with danger and choices.",
      platform: "PC / Console",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg",
    url: "https://store.steampowered.com/app/1091500/Cyberpunk_2077/"
    },
    {
      title: "Roblox",
      category: "Multiplayer",
      description: "Explore millions of experiences, play with friends, and create your own adventures.",
      platform: "PC / Console / Mobile",
      image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=900&q=80",
      url: "https://www.roblox.com/"
    },
     {
      title: "Minecraft",
      category: "Sandbox",
      description: "Build, explore, and survive in an endless block-based world.",
      platform: "PC / Console / Mobile",
      image: "https://cdn.akamai.steamstatic.com/steam/apps/1672970/header.jpg",
      url: "https://www.minecraft.net/"
    },
    {
      title: "Five Nights at Freddy's",
      category: "Horror",
      description: "Survive terrifying nights inside a haunted family pizzeria.",
      platform: "PC / Console",
      image: "https://cdn.akamai.steamstatic.com/steam/apps/319510/header.jpg",
      url: "https://store.steampowered.com/app/319510/Five_Nights_at_Freddys/"
    },
    {
      title: "Grand Theft Auto V",
      category: "Action",
      description: "Explore Los Santos in a massive open-world crime adventure.",
      platform: "PC / Console",
      image: "https://cdn.akamai.steamstatic.com/steam/apps/3240220/header.jpg",
      url: "https://store.steampowered.com/app/3240220/Grand_Theft_Auto_V_Enhanced/"
    },
    {
      title: "Lethal Company",
      category: "Horror",
      description: "Team up to scavenge abandoned moons while avoiding deadly creatures.",
      platform: "PC",
      image: "https://cdn.akamai.steamstatic.com/steam/apps/1966720/header.jpg",
      url: "https://store.steampowered.com/app/1966720/Lethal_Company/"
    },
    {
      title: "Terraria",
      category: "Adventure",
      description: "Dig, fight, explore, and build in a vast 2D sandbox world.",
      platform: "PC / Console / Mobile",
      image: "https://cdn.akamai.steamstatic.com/steam/apps/105600/header.jpg",
      url: "https://store.steampowered.com/app/105600/Terraria/"
    },
    {
      title: "Shell Shockers",
      category: "Multiplayer",
      description: "Battle other players in a fast-paced multiplayer egg shooter.",
      platform: "Free Browser Game",
      playMode: "external",
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80",
      url: "https://shellshock.io/"
    },
    {
      title: "Agar.io",
      category: "Multiplayer",
      description: "Grow your cell and compete against players around the world.",
      platform: "Free Browser Game",
      playMode: "external",
      image: "https://images.unsplash.com/photo-1614294149010-950b698f72c0?auto=format&fit=crop&w=900&q=80",
      url: "https://agar.io/"
    },
    {
      title: "Slither.io",
      category: "Arcade",
      description: "Grow your snake, collect glowing orbs, and outlast your rivals.",
      platform: "Free Browser Game",
      playMode: "external",
      image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
      url: "https://slither.io/"
    },
    {
      title: "Smash Karts",
      category: "Racing",
      description: "Race, collect weapons, and battle other players in kart arenas.",
      platform: "Free Browser Game",
      playMode: "external",
      image: "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=900&q=80",
      url: "https://smashkarts.io/"
    },
    {
      title: "Skribbl.io",
      category: "Party",
      description: "Draw mystery words while your friends race to guess them.",
      platform: "Free Browser Game",
      playMode: "external",
      image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80",
      url: "https://skribbl.io/"
    },
    {
      title: "Gartic Phone",
      category: "Party",
      description: "Play a hilarious drawing and guessing game with friends.",
      platform: "Free Browser Game",
      playMode: "external",
      image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80",
      url: "https://garticphone.com/"
    },
    {
      title: "TETR.IO",
      category: "Puzzle",
      description: "Play competitive multiplayer block-stacking battles.",
      platform: "Free Browser Game",
      playMode: "external",
      image: "https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?auto=format&fit=crop&w=900&q=80",
      url: "https://tetr.io/"
    },
    {
      title: "2048",
      category: "Puzzle",
      description: "Combine matching numbers and work your way to 2048.",
      platform: "Free Browser Game",
      playMode: "external",
      image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80",
      url: "https://play2048.co/"
    },
    {
      title: "Lichess",
      category: "Strategy",
      description: "Play chess online, solve puzzles, and challenge other players.",
      platform: "Free Browser Game",
      playMode: "external",
      image: "https://images.unsplash.com/photo-1586165368502-1bad197a6461?auto=format&fit=crop&w=900&q=80",
      url: "https://lichess.org/"
    },
    {
      title: "Bloxd.io",
      category: "Sandbox",
      description: "Explore block-based worlds, parkour challenges, and multiplayer modes.",
      platform: "Free Browser Game",
      playMode: "external",
      image: "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?auto=format&fit=crop&w=900&q=80",
      url: "https://bloxd.io/"
    },
    {
      title: "Last Seen Online",
       category: "Horror",
      platform: "Free Browser Game",
     playMode: "external",
     image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455",
   description: "Investigate an abandoned desktop, uncover hidden files, and solve a disturbing psychological horror mystery.",
    url: "https://lastseenonline.com/"
  },
  {
    title: "Flesh, Blood, & Concrete",
    category: "Horror",
    platform: "Free Browser Game",
    playMode: "external",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23",
    description: "Explore a decaying apartment complex in this gritty, claustrophobic psychological horror RPG.",
    url: "https://waxwing0.itch.io/fbc"
  },
  {
    title: "Fear Assessment",
    category: "Horror",
    platform: "Free Browser Game",
    playMode: "external",
    image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b",
    description: "Take a surreal interactive fear test that turns psychological scenarios into unsettling horror. Contains flashing lights and loud sounds.",
    url: "https://www.newgrounds.com/portal/view/945518"
  },
  {
    title: "DeadRise.io",
    category: "Horror",
    platform: "Free Browser Game",
    playMode: "external",
    image: "https://images.unsplash.com/photo-1509248961158-e54f6934749c",
    description: "Survive a zombie outbreak in this multiplayer browser-based action horror shooter.",
    url: "https://poki.com/en/g/deadrise-io"
  },
  {
    title: "Scary Maze",
    category: "Horror",
    platform: "Free Browser Game",
    playMode: "external",
    image: "https://images.unsplash.com/photo-1505635552518-3448ff116af3",
    description: "Navigate a deceptively simple maze where concentration and steady hands are put to the test.",
    url: "https://www.crazygames.com/game/scary-maze"
  },
  {
    title: "Exhibit of Sorrows",
    category: "Horror",
    platform: "Free Browser Game",
    playMode: "external",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23",
    description: "Explore a creepy circus-themed exhibition filled with disturbing dolls, strange puzzles, and unsettling secrets.",
    url: "https://adayofjoy.itch.io/exhibit-of-sorrows"
  },
  {
    title: "The Last Broadcast",
    category: "Horror",
    platform: "Free Browser Demo",
    playMode: "external",
    image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc",
    description: "Work an isolated overnight radio station as strange signals and mysterious transmissions begin to emerge.",
    url: "https://lguidolin.itch.io/the-last-broadcast" 
  },
  {
    title: "VRChat",
    category: "Avatar",
    description: "Create your own avatar, explore immersive virtual worlds, and socialize with players around the world.",
    platform: "PC / VR",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/438100/header.jpg",
    url: "https://store.steampowered.com/app/438100/VRChat/"
   },
   {
    title: "IMVU",
    category: "Avatar",
    description: "Design your own 3D avatar, customize outfits, decorate spaces, and meet people in virtual social worlds.",
    platform: "PC / Mobile / Web",
    image: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=900&q=80",
    playMode: "external",
    url: "https://www.imvu.com/"
   },
   {
    title: "Second Life",
    category: "Avatar",
    description: "Build a virtual identity, customize your avatar, own virtual spaces, and explore a massive user-created world.",
    platform: "PC / Mac",
    image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
    url: "https://secondlife.com/"
   },
   {
    title: "ZEPETO",
    category: "Avatar",
    description: "Create a 3D avatar, customize your style, visit virtual worlds, and connect with other players.",
    platform: "Mobile / PC",
    image: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=80",
    playMode: "external",
   url: "https://zepeto.me/"
   },
   {
    title: "The Sims 4",
    category: "Simulation",
    description: "Create unique characters, build homes, develop relationships, and guide your Sims through everyday life.",
    platform: "PC / Mac / Console",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/1222670/header.jpg",
    url: "https://store.steampowered.com/app/1222670/The_Sims_4/"
   },
   {
    title: "House Flipper",
    category: "Simulation",
    description: "Buy rundown houses, renovate them, clean, decorate, and turn neglected properties into beautiful homes.",
    platform: "PC / Console",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/613100/header.jpg",
    url: "https://store.steampowered.com/app/613100/House_Flipper/"
   },
   {
    title: "Euro Truck Simulator 2",
    category: "Simulation",
    description: "Travel across Europe as a truck driver, deliver cargo, manage your business, and build your own trucking empire.",
    platform: "PC / Mac",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/227300/header.jpg",
    url: "https://store.steampowered.com/app/227300/Euro_Truck_Simulator_2/"
   },
   {
    title: "Farming Simulator 25",
    category: "Simulation",
    description: "Build and manage your own farm, grow crops, raise livestock, operate heavy machinery, and expand your agricultural business.",
    platform: "PC / Mac / Console",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/2300320/header.jpg",
    url: "https://store.steampowered.com/app/2300320/Farming_Simulator_25/"
   },
   {
    title: "Planet Zoo",
    category: "Simulation",
    description: "Design and manage your own zoo, care for amazing animals, build habitats, and keep visitors happy.",
    platform: "PC",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/703080/header.jpg",
    url: "https://store.steampowered.com/app/703080/Planet_Zoo/"
   },
   {
    title: "Forza Horizon 5",
    category: "Racing",
    description: "Explore a massive open-world Mexico, race hundreds of cars, compete in events, and customize your driving experience.",
    platform: "PC / Xbox",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/1551360/header.jpg",
    url: "https://store.steampowered.com/app/1551360/Forza_Horizon_5/"
   },
   {
    title: "Need for Speed Heat",
    category: "Racing",
    description: "Race through the streets by day and risk everything at night in illegal street races while building your reputation.",
    platform: "PC / PlayStation / Xbox",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/1222680/header.jpg",
    url: "https://store.steampowered.com/app/1222680/Need_for_Speed_Heat/"
   },
   {
    title: "Assetto Corsa",
    category: "Racing",
    description: "Experience realistic driving physics, detailed cars, and challenging circuits in this acclaimed racing simulator.",
    platform: "PC / PlayStation / Xbox",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/244210/header.jpg",
    url: "https://store.steampowered.com/app/244210/Assetto_Corsa/"
   },
   {
    title: "The Crew Motorfest",
    category: "Racing",
    description: "Race across a beautiful open-world Hawaiian island, collect exotic vehicles, and compete in exciting driving events.",
    platform: "PC / PlayStation / Xbox",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/2698940/header.jpg",
    url: "https://store.steampowered.com/app/2698940/The_Crew_Motorfest/"
   },
   {
    title: "Trackmania",
    category: "Racing",
    description: "Race through creative tracks filled with loops, jumps, obstacles, and wild challenges. Compete for the fastest times.",
    platform: "PC",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/2225070/header.jpg",
    url: "https://store.steampowered.com/app/2225070/Trackmania/"
   },
   {
    title: "EA SPORTS FC 26",
    category: "Sports",
    description: "Build your dream squad, compete in football matches, manage your club, and take on players around the world.",
    platform: "PC / PlayStation / Xbox",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/3405690/header.jpg",
    url: "https://store.steampowered.com/app/3405690/EA_SPORTS_FC_26/"
   },
   {
    title: "NBA 2K26",
    category: "Sports",
    description: "Build your basketball career, create your dream team, compete in realistic NBA games, and challenge other players.",
    platform: "PC / PlayStation / Xbox",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/3472040/header.jpg",
    url: "https://store.steampowered.com/app/3472040/NBA_2K26/"
   },
   {
    title: "Golf With Your Friends",
    category: "Sports",
    description: "Play chaotic mini-golf courses with friends, tackle creative obstacles, and compete for the lowest score.",
    platform: "PC / PlayStation / Xbox / Nintendo Switch",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/431240/header.jpg",
    url: "https://store.steampowered.com/app/431240/Golf_With_Your_Friends/"
   },
   {
    title: "WWE 2K26",
    category: "Sports",
    description: "Step into the ring, create your own superstar, compete in wrestling matches, and build your legacy.",
    platform: "PC / PlayStation / Xbox",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/2769200/header.jpg",
    url: "https://store.steampowered.com/app/2769200/WWE_2K26/"
   },
   {
    title: "Rocket League",
    category: "Sports",
    description: "Combine soccer and rocket-powered cars in fast-paced matches. Score goals, perform aerial tricks, and compete online.",
    platform: "PC / PlayStation / Xbox / Nintendo Switch",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/252950/header.jpg",
    url: "https://www.rocketleague.com/"
   },
   {
    title: "Among Us",
    category: "Multiplayer",
    description: "Work together to complete tasks aboard a spaceship while impostors secretly sabotage the crew.",
    platform: "PC / Mobile / Console",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/945360/header.jpg",
    url: "https://store.steampowered.com/app/945360/Among_Us/"
   },
   {
    title: "Fall Guys",
    category: "Multiplayer",
    description: "Compete against dozens of players in chaotic obstacle courses, survival rounds, and colorful elimination challenges.",
    platform: "PC / PlayStation / Xbox / Nintendo Switch",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg",
    url: "https://www.fallguys.com/"
   },
   {
    title: "Pummel Party",
    category: "Multiplayer",
    description: "Battle your friends in a chaotic multiplayer party game filled with wild minigames, traps, and competitive board-game challenges.",
    platform: "PC / Console",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/880940/header.jpg",
    url: "https://store.steampowered.com/app/880940/Pummel_Party/"
   },
   {
    title: "Content Warning",
    category: "Multiplayer",
    description: "Team up with friends, film terrifying creatures in abandoned places, and try to become famous on SpookTube.",
    platform: "PC",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/2881650/header.jpg",
    url: "https://store.steampowered.com/app/2881650/Content_Warning/"
   },
   {
    title: "DEVOUR",
    category: "Multiplayer",
    description: "Team up with up to four players to stop possessed cultists in terrifying locations before they catch you.",
    platform: "PC",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/1274570/header.jpg",
    url: "https://store.steampowered.com/app/1274570/DEVOUR/"
   },
   {
    title: "Party Animals",
    category: "Multiplayer",
    description: "Brawl with friends as adorable animals in chaotic physics-based matches, team battles, and competitive minigames.",
    platform: "PC / Xbox",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/1260320/header.jpg",
    url: "https://store.steampowered.com/app/1260320/Party_Animals/"
   },
   {
    title: "PICO PARK",
    category: "Multiplayer",
    description: "Work together with friends to solve clever puzzles, overcome obstacles, and reach the goal through teamwork.",
    platform: "PC / Nintendo Switch",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/1509960/header.jpg",
    url: "https://store.steampowered.com/app/1509960/PICO_PARK/"
   },
   {
    title: "Overcooked! 2",
    category: "Multiplayer",
    description: "Team up in chaotic kitchens, prepare meals under pressure, and coordinate with friends to serve hungry customers.",
    platform: "PC / PlayStation / Xbox / Nintendo Switch",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/728880/header.jpg",
    url: "https://store.steampowered.com/app/728880/Overcooked_2/"
   },
   {
    title: "Don't Starve Together",
    category: "Multiplayer",
    description: "Survive a strange and dangerous wilderness with friends by gathering resources, crafting equipment, building shelter, and fighting monsters.",
    platform: "PC / Mac / Console",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/322330/header.jpg",
    url: "https://store.steampowered.com/app/322330/Dont_Starve_Together/"
   },
   {
    title: "Goose Goose Duck",
    category: "Multiplayer",
    description: "Play a social deduction game with friends, complete tasks, uncover impostors, and survive hilarious rounds of deception.",
    platform: "PC / Mobile",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/1568590/header.jpg",
    url: "https://store.steampowered.com/app/1568590/Goose_Goose_Duck/"
   },
   {
    title: "Human: Fall Flat",
    category: "Multiplayer",
    description: "Solve physics-based puzzles, climb obstacles, and explore creative levels with friends using hilarious wobbly characters.",
    platform: "PC / PlayStation / Xbox / Nintendo Switch",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/477160/header.jpg",
     url: "https://store.steampowered.com/app/477160/Human_Fall_Flat/"
   },
   {
    title: "Portal 2",
    category: "Puzzle",
    description: "Solve mind-bending puzzles using a portal gun, manipulate physics, and escape a mysterious testing facility.",
    platform: "PC / Mac / Console",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/620/header.jpg",
    url: "https://store.steampowered.com/app/620/Portal_2/"
   },
   {
    title: "The Witness",
    category: "Puzzle",
    description: "Explore a mysterious island filled with intricate environmental puzzles that challenge your observation, logic, and problem-solving skills.",
    platform: "PC / PlayStation / Xbox / Mobile",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/210970/header.jpg",
    url: "https://store.steampowered.com/app/210970/The_Witness/"
   },
   {
    title: "Baba Is You",
    category: "Puzzle",
    description: "Rewrite the rules of each level by moving words around to solve clever puzzles where the laws of the game are yours to change.",
    platform: "PC / Mac / Nintendo Switch / Mobile",
    image: "https://cdn.akamai.steamstatic.com/steam/apps/736260/header.jpg",
    url: "https://store.steampowered.com/app/736260/Baba_Is_You/"
   },
   {
  title: "Unpacking",
  category: "Puzzle",
  description: "Unpack boxes and organize belongings into new homes while uncovering the story of someone's life through their possessions.",
  platform: "PC / Mac / Console / Mobile",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1135690/header.jpg",
  url: "https://store.steampowered.com/app/1135690/Unpacking/"
   },
   {
  title: "Human Resource Machine",
  category: "Puzzle",
  description: "Solve programming-inspired puzzles by giving office workers instructions to automate tasks and overcome increasingly challenging problems.",
  platform: "PC / Mac / Nintendo Switch / Mobile",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/375820/header.jpg",
  url: "https://store.steampowered.com/app/375820/Human_Resource_Machine/"
   },
   {
  title: "The Talos Principle",
  category: "Puzzle",
  description: "Explore ancient ruins and solve challenging logic puzzles involving lasers, jammers, and time manipulation while uncovering a mysterious story.",
  platform: "PC / Mac / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/257510/header.jpg",
  url: "https://store.steampowered.com/app/257510/The_Talos_Principle/"
   },
   {
  title: "Superliminal",
  category: "Puzzle",
  description: "Escape a surreal dream world by solving perspective-based puzzles where objects change size depending on how you see them.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1049410/header.jpg",
  url: "https://store.steampowered.com/app/1049410/Superliminal/"
   },
   {
  title: "Viewfinder",
  category: "Puzzle",
  description: "Use photographs and images to reshape reality, create new paths, and solve imaginative optical puzzles.",
  platform: "PC / PlayStation",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1382070/header.jpg",
  url: "https://store.steampowered.com/app/1382070/Viewfinder/"
   },
   {
  title: "Escape Simulator",
  category: "Puzzle",
  description: "Explore interactive escape rooms, search for hidden clues, solve puzzles, and work with friends to find your way out.",
  platform: "PC / VR",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1435790/header.jpg",
  url: "https://store.steampowered.com/app/1435790/Escape_Simulator/"
   },
   {
  title: "We Were Here",
  category: "Puzzle",
  description: "Team up with a partner trapped in a mysterious Antarctic castle. Communicate through walkie-talkies to solve puzzles and escape together.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/582500/header.jpg",
  url: "https://store.steampowered.com/app/582500/We_Were_Here/"
    },
    {
  title: "Keep Talking and Nobody Explodes",
  category: "Puzzle",
  description: "Defuse complicated bombs under pressure while one player handles the device and teammates communicate instructions from a bomb manual.",
  platform: "PC / VR / PlayStation / Xbox / Mobile",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/341800/header.jpg",
  url: "https://store.steampowered.com/app/341800/Keep_Talking_and_Nobody_Explodes/"
    },
    {
  title: "Geometry Dash",
  category: "Arcade",
  description: "Jump, fly, and dodge obstacles through rhythm-based levels filled with challenging traps, music, and fast-paced action.",
  platform: "PC / Mobile",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/322170/header.jpg",
  url: "https://store.steampowered.com/app/322170/Geometry_Dash/"
    },
    {
  title: "Vampire Survivors",
  category: "Arcade",
  description: "Survive endless waves of monsters, collect powerful weapons, upgrade abilities, and see how long you can last.",
  platform: "PC / Mac / Console / Mobile",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1794680/header.jpg",
  url: "https://store.steampowered.com/app/1794680/Vampire_Survivors/"
},
     {
  title: "Brotato",
  category: "Arcade",
  description: "Control a potato warrior armed with multiple weapons, fight off alien hordes, collect materials, and survive increasingly difficult waves.",
  platform: "PC / Mac / Console / Mobile",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1942280/header.jpg",
  url: "https://store.steampowered.com/app/1942280/Brotato/"
},
     {
  title: "Balatro",
  category: "Arcade",
  description: "Build powerful poker-inspired combinations, discover wild card synergies, and chase increasingly difficult high scores.",
  platform: "PC / Mac / Console / Mobile",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/2379780/header.jpg",
  url: "https://store.steampowered.com/app/2379780/Balatro/"
},
     {
  title: "Peglin",
  category: "Arcade",
  description: "Play a roguelike pachinko adventure, launch orbs at enemies, trigger powerful effects, and collect upgrades as you progress.",
  platform: "PC / Mac / Mobile",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1296610/header.jpg",
  url: "https://store.steampowered.com/app/1296610/Peglin/"
},
     {
  title: "Downwell",
  category: "Arcade",
  description: "Descend into a dangerous well filled with monsters and treasures while using gunboots to fight enemies and control your fall.",
  platform: "PC / Mac / Mobile",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/360740/header.jpg",
  url: "https://store.steampowered.com/app/360740/Downwell/"
},
     {
  title: "Enter the Gungeon",
  category: "Arcade",
  description: "Fight through dangerous dungeon floors filled with bizarre enemies, powerful weapons, secret rooms, and challenging bosses.",
  platform: "PC / Mac / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/311690/header.jpg",
  url: "https://store.steampowered.com/app/311690/Enter_the_Gungeon/"
},
     {
  title: "Hades",
  category: "Arcade",
  description: "Battle your way out of the Greek underworld, defeat mythological enemies, unlock powerful abilities, and discover an evolving story.",
  platform: "PC / Mac / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1145360/header.jpg",
  url: "https://store.steampowered.com/app/1145360/Hades/"
},
     {
  title: "Cuphead",
  category: "Arcade",
  description: "Take on challenging boss battles and run-and-gun levels in a beautifully hand-drawn cartoon world inspired by 1930s animation.",
  platform: "PC / Mac / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/268910/header.jpg",
  url: "https://store.steampowered.com/app/268910/Cuphead/"
},
     {
  title: "Sid Meier's Civilization VI",
  category: "Strategy",
  description: "Build an empire, develop cities, research technologies, form alliances, and compete against rival civilizations throughout history.",
  platform: "PC / Mac / PlayStation / Xbox / Nintendo Switch / Mobile",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/289070/header.jpg",
  url: "https://store.steampowered.com/app/289070/Sid_Meiers_Civilization_VI/"
},
     {
  title: "Age of Empires IV",
  category: "Strategy",
  description: "Build powerful civilizations, gather resources, command armies, and wage epic historical battles across different eras.",
  platform: "PC / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1466860/header.jpg",
  url: "https://store.steampowered.com/app/1466860/Age_of_Empires_IV_Anniversary_Edition/"
},
     {
  title: "Stellaris",
  category: "Strategy",
  description: "Explore a vast galaxy, discover alien civilizations, build interstellar empires, conduct diplomacy, and wage massive space wars.",
  platform: "PC / Mac / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/281990/header.jpg",
  url: "https://store.steampowered.com/app/281990/Stellaris/"
},
     {
  title: "XCOM 2",
  category: "Strategy",
  description: "Lead a resistance force against an alien occupation, command tactical squads, research advanced technology, and fight turn-based battles.",
  platform: "PC / Mac / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/268500/header.jpg",
  url: "https://store.steampowered.com/app/268500/XCOM_2/"
},
     {
  title: "Total War: WARHAMMER III",
  category: "Strategy",
  description: "Command legendary fantasy armies, conquer massive territories, forge alliances, and fight enormous real-time battles.",
  platform: "PC / Mac",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1142710/header.jpg",
  url: "https://store.steampowered.com/app/1142710/Total_War_WARHAMMER_III/"
},
     {
  title: "RimWorld",
  category: "Strategy",
  description: "Manage a colony of crash-landed survivors, build settlements, manage relationships, survive disasters, and defend against hostile threats.",
  platform: "PC / Mac / Linux",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/294100/header.jpg",
  url: "https://store.steampowered.com/app/294100/RimWorld/"
},
     {
  title: "Crusader Kings III",
  category: "Strategy",
  description: "Build a medieval dynasty, manage kingdoms, forge political alliances, wage wars, and shape generations of rulers.",
  platform: "PC / Mac / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1158310/header.jpg",
  url: "https://store.steampowered.com/app/1158310/Crusader_Kings_III/"
},
     {
  title: "Hearts of Iron IV",
  category: "Strategy",
  description: "Take command of a nation during World War II, manage industry, research technology, form alliances, and lead massive military campaigns.",
  platform: "PC / Mac / Linux",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/394360/header.jpg",
  url: "https://store.steampowered.com/app/394360/Hearts_of_Iron_IV/"
},
     {
  title: "Garry's Mod",
  category: "Sandbox",
  description: "Create anything you imagine using physics tools, custom objects, community addons, and endless user-created game modes.",
  platform: "PC / Mac / Linux",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/4000/header.jpg",
  url: "https://store.steampowered.com/app/4000/Garrys_Mod/"
},
     {
  title: "Teardown",
  category: "Sandbox",
  description: "Explore fully destructible voxel environments, smash through buildings, create elaborate heists, and experiment with physics.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1167630/header.jpg",
  url: "https://store.steampowered.com/app/1167630/Teardown/"
},
     {
  title: "People Playground",
  category: "Sandbox",
  description: "Experiment in a physics-based sandbox filled with interactive objects, machines, tools, and creative contraptions.",
  platform: "PC",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1118200/header.jpg",
  url: "https://store.steampowered.com/app/1118200/People_Playground/"
},
     {
  title: "Besiege",
  category: "Sandbox",
  description: "Build bizarre medieval machines, design creative weapons, and use physics to destroy castles, armies, and obstacles.",
  platform: "PC / Mac / Linux / Console",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/346010/header.jpg",
  url: "https://store.steampowered.com/app/346010/Besiege/"
},
     {
  title: "Universe Sandbox",
  category: "Sandbox",
  description: "Create and manipulate galaxies, planets, stars, and black holes while experimenting with gravity, collisions, and cosmic events.",
  platform: "PC / Mac / VR",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/230290/header.jpg",
  url: "https://store.steampowered.com/app/230290/Universe_Sandbox/"
},
     {
  title: "Scrap Mechanic",
  category: "Sandbox",
  description: "Build incredible machines, vehicles, and automated creations using an enormous collection of mechanical parts and tools.",
  platform: "PC",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/387990/header.jpg",
  url: "https://store.steampowered.com/app/387990/Scrap_Mechanic/"
},
     {
  title: "Trailmakers",
  category: "Sandbox",
  description: "Build custom cars, planes, boats, and wild machines from modular parts, then test your creations in an open world.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/585420/header.jpg",
  url: "https://store.steampowered.com/app/585420/Trailmakers/"
},
     {
  title: "Red Dead Redemption 2",
  category: "Adventure",
  description: "Explore a vast Wild West open world, hunt, complete missions, meet unforgettable characters, and experience an epic outlaw story.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg",
  url: "https://store.steampowered.com/app/1174180/Red_Dead_Redemption_2/"
},
     {
  title: "God of War",
  category: "Adventure",
  description: "Journey through Norse mythology as Kratos and his son Atreus face dangerous creatures, powerful gods, and personal challenges.",
  platform: "PC / PlayStation",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1593500/header.jpg",
  url: "https://store.steampowered.com/app/1593500/God_of_War/"
},
     {
  title: "Uncharted: Legacy of Thieves Collection",
  category: "Adventure",
  description: "Join Nathan Drake and Chloe Frazer on cinematic treasure-hunting adventures filled with exploration, puzzles, and dangerous encounters.",
  platform: "PC / PlayStation",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1659420/header.jpg",
  url: "https://store.steampowered.com/app/1659420/UNCHARTED_Legacy_of_Thieves_Collection/"
},
     {
  title: "Horizon Zero Dawn Remastered",
  category: "Adventure",
  description: "Explore a beautiful post-apocalyptic world filled with robotic creatures, ancient mysteries, dangerous machines, and unforgettable adventures.",
  platform: "PC / PlayStation",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/2561580/header.jpg",
  url: "https://store.steampowered.com/app/2561580/Horizon_Zero_Dawn_Remastered/"
},
     {
  title: "Stray",
  category: "Adventure",
  description: "Explore a mysterious cyberpunk city as a stray cat, solve environmental puzzles, meet robots, and uncover hidden secrets.",
  platform: "PC / Mac / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1332010/header.jpg",
  url: "https://store.steampowered.com/app/1332010/Stray/"
},
     {
  title: "Subnautica",
  category: "Adventure",
  description: "Explore a mysterious alien ocean, discover underwater ecosystems, gather resources, build submarines, and uncover the secrets of an unknown planet.",
  platform: "PC / Mac / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/264710/header.jpg",
  url: "https://store.steampowered.com/app/264710/Subnautica/"
},
     {
  title: "Firewatch",
  category: "Adventure",
  description: "Explore the Wyoming wilderness as a fire lookout, uncover strange events, and build a mysterious connection through radio conversations.",
  platform: "PC / Mac / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/383870/header.jpg",
  url: "https://store.steampowered.com/app/383870/Firewatch/"
},
     {
  title: "A Plague Tale: Innocence",
  category: "Adventure",
  description: "Follow two siblings through a dark medieval world filled with danger, mysterious forces, and terrifying swarms of rats.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/752590/header.jpg",
  url: "https://store.steampowered.com/app/752590/A_Plague_Tale_Innocence/"
},
     {
  title: "Ghost of Tsushima DIRECTOR'S CUT",
  category: "Adventure",
  description: "Explore feudal Japan as a samurai fighting to protect Tsushima Island, master sword combat, and uncover a breathtaking open world.",
  platform: "PC / PlayStation",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/2215430/header.jpg",
  url: "https://store.steampowered.com/app/2215430/Ghost_of_Tsushima_DIRECTORS_CUT/"
},
     {
  title: "Hogwarts Legacy",
  category: "Adventure",
  description: "Explore the wizarding world, attend Hogwarts, learn powerful spells, discover hidden secrets, and shape your own magical adventure.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/990080/header.jpg",
  url: "https://store.steampowered.com/app/990080/Hogwarts_Legacy/"
},
     {
  title: "DOOM Eternal",
  category: "Action",
  description: "Become the Slayer, battle terrifying demon armies, wield devastating weapons, and fight to save humanity from an invasion of Hell.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/782330/header.jpg",
  url: "https://store.steampowered.com/app/782330/DOOM_Eternal/"
},
     {
  title: "Devil May Cry 5",
  category: "Action",
  description: "Fight demonic enemies with stylish combat, powerful weapons, supernatural abilities, and three unique playable characters.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/601150/header.jpg",
  url: "https://store.steampowered.com/app/601150/Devil_May_Cry_5/"
},
     {
  title: "Sekiro: Shadows Die Twice",
  category: "Action",
  description: "Master precise sword combat, stealth, and deadly prosthetic weapons in a challenging adventure through supernatural feudal Japan.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/814380/header.jpg",
  url: "https://store.steampowered.com/app/814380/Sekiro_Shadows_Die_Twice/"
},
     {
  title: "Nioh 2 – The Complete Edition",
  category: "Action",
  description: "Battle terrifying yokai, master intense samurai combat, collect powerful gear, and unleash supernatural abilities in a brutal Japanese fantasy world.",
  platform: "PC / PlayStation",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1325200/header.jpg",
  url: "https://store.steampowered.com/app/1325200/Nioh_2_The_Complete_Edition/"
},
     {
  title: "Dying Light 2 Stay Human",
  category: "Action",
  description: "Survive a massive zombie outbreak, explore a dangerous open world, master parkour, and fight for humanity's future.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/534380/header.jpg",
  url: "https://store.steampowered.com/app/534380/Dying_Light_2_Stay_Human/"
},
     {
  title: "Metal Gear Rising: Revengeance",
  category: "Action",
  description: "Play as Raiden in a fast-paced cybernetic action adventure featuring intense sword combat, brutal finishing moves, and high-speed battles.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/235460/header.jpg",
  url: "https://store.steampowered.com/app/235460/METAL_GEAR_RISING_REVENGEANCE/"
},
     {
  title: "Warhammer 40,000: Space Marine 2",
  category: "Action",
  description: "Become a Space Marine, unleash devastating weapons, and battle endless Tyranid swarms in brutal third-person combat.",
  platform: "PC / PlayStation 5 / Xbox Series X|S",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/2183900/header.jpg",
  url: "https://store.steampowered.com/app/2183900/Warhammer_40000_Space_Marine_2/"
},
     {
  title: "Control Ultimate Edition",
  category: "Action",
  description: "Explore a mysterious government facility, wield supernatural powers, manipulate reality, and uncover disturbing paranormal secrets.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/870780/header.jpg",
  url: "https://store.steampowered.com/app/870780/Control_Ultimate_Edition/"
},
     {
  title: "Batman: Arkham Knight",
  category: "Action",
  description: "Become the Dark Knight, protect Gotham City, master brutal combat, investigate crimes, and face the mysterious Arkham Knight.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/208650/header.jpg",
  url: "https://store.steampowered.com/app/208650/Batman_Arkham_Knight/"
},
     {
  title: "Middle-earth: Shadow of War",
  category: "Action",
  description: "Fight through Mordor, build an army, conquer enemy fortresses, and use the Nemesis System to create your own epic battles.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/356190/header.jpg",
  url: "https://store.steampowered.com/app/356190/Middleearth_Shadow_of_War/"
},
     {
  title: "Mad Max",
  category: "Action",
  description: "Survive a brutal wasteland, customize your war vehicle, battle savage gangs, and fight your way through a post-apocalyptic world.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/234140/header.jpg",
  url: "https://store.steampowered.com/app/234140/Mad_Max/"
},
     {
  title: "Amnesia: The Dark Descent",
  category: "Horror",
  description: "Explore a terrifying castle, solve puzzles, avoid monstrous creatures, and uncover the disturbing truth behind your lost memories.",
  platform: "PC / Mac / Linux",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/57300/header.jpg",
  url: "https://store.steampowered.com/app/57300/Amnesia_The_Dark_Descent/"
},
     {
  title: "SOMA",
  category: "Horror",
  description: "Uncover the horrifying secrets of an underwater research facility where machines blur the line between human consciousness and artificial life.",
  platform: "PC / Mac / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/282140/header.jpg",
  url: "https://store.steampowered.com/app/282140/SOMA/"
},
     {
  title: "Alien: Isolation",
  category: "Horror",
  description: "Survive aboard a deserted space station while being hunted by an intelligent Xenomorph that learns from your actions.",
  platform: "PC / Mac / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/214490/header.jpg",
  url: "https://store.steampowered.com/app/214490/Alien_Isolation/"
},
     {
  title: "The Mortuary Assistant",
  category: "Horror",
  description: "Work overnight in a funeral home, embalm bodies, investigate disturbing supernatural occurrences, and survive demonic encounters.",
  platform: "PC / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1295920/header.jpg",
  url: "https://store.steampowered.com/app/1295920/The_Mortuary_Assistant/"
},
     {
  title: "MADiSON",
  category: "Horror",
  description: "Experience psychological terror through a haunted camera, solve disturbing puzzles, and uncover a sinister story spanning generations.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1670870/header.jpg",
  url: "https://store.steampowered.com/app/1670870/MADiSON/"
},
     {
  title: "Visage",
  category: "Horror",
  description: "Explore a disturbing haunted house, uncover the tragic stories of its former residents, and survive terrifying supernatural encounters.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/594330/header.jpg",
  url: "https://store.steampowered.com/app/594330/Visage/"
},
     {
  title: "Outlast 2",
  category: "Horror",
  description: "Investigate a brutal murder in an isolated desert community, uncover a disturbing religious conspiracy, and escape terrifying pursuers.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/414700/header.jpg",
  url: "https://store.steampowered.com/app/414700/Outlast_2/"
},
     {
  title: "Little Nightmares II",
  category: "Horror",
  description: "Guide a young boy through a twisted world filled with monstrous creatures, disturbing environments, and deadly puzzles.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/860510/header.jpg",
  url: "https://store.steampowered.com/app/860510/Little_Nightmares_II/"
},
     {
  title: "The Callisto Protocol",
  category: "Horror",
  description: "Fight for survival inside a terrifying prison on Jupiter's moon, facing grotesque creatures and horrifying experiments.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1544020/header.jpg",
  url: "https://store.steampowered.com/app/1544020/The_Callisto_Protocol/"
},
     {
  title: "Dead Space",
  category: "Horror",
  description: "Survive aboard the abandoned USG Ishimura, dismember terrifying Necromorphs, and uncover the horrifying truth behind a deadly outbreak.",
  platform: "PC / PlayStation 5 / Xbox Series X|S",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1693980/header.jpg",
  url: "https://store.steampowered.com/app/1693980/Dead_Space/"
},
     {
  title: "Burnout Paradise Remastered",
  category: "Racing",
  description: "Race through an open-world city, perform spectacular stunts, cause massive crashes, and compete in high-speed events.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1238080/header.jpg",
  url: "https://store.steampowered.com/app/1238080/Burnout_Paradise_Remastered/"
},
     {
  title: "DiRT Rally 2.0",
  category: "Racing",
  description: "Race across demanding rally stages around the world, master realistic vehicle handling, and push your driving skills to the limit.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/690790/header.jpg",
  url: "https://store.steampowered.com/app/690790/DiRT_Rally_20/"
},
     {
  title: "Wreckfest",
  category: "Racing",
  description: "Compete in chaotic demolition races, smash through opponents, customize your vehicles, and survive spectacular crashes.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/228380/header.jpg",
  url: "https://store.steampowered.com/app/228380/Wreckfest/"
},
     {
  title: "F1 25",
  category: "Racing",
  description: "Experience the official Formula 1 championship, compete against the world's best drivers, and build your racing career.",
  platform: "PC / PlayStation 5 / Xbox Series X|S",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/3059520/header.jpg",
  url: "https://store.steampowered.com/app/3059520/F1_25/"
},
     {
  title: "Need for Speed Unbound",
  category: "Racing",
  description: "Race through a vibrant open-world city, customize high-performance cars, escape police pursuits, and compete in intense street racing events.",
  platform: "PC / PlayStation 5 / Xbox Series X|S",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1846380/header.jpg",
  url: "https://store.steampowered.com/app/1846380/Need_for_Speed_Unbound/"
},
     {
  title: "Ultimate Chicken Horse",
  category: "Party",
  description: "Build dangerous obstacle courses with your friends, place traps, and race to the finish in this chaotic multiplayer party game.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/386940/header.jpg",
  url: "https://store.steampowered.com/app/386940/Ultimate_Chicken_Horse/"
},
     {
  title: "Move or Die",
  category: "Party",
  description: "Compete in frantic mini-games where standing still means instant elimination, with constantly changing rules and chaotic multiplayer action.",
  platform: "PC",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/323850/header.jpg",
  url: "https://store.steampowered.com/app/323850/Move_or_Die/"
},
     {
  title: "Stick Fight: The Game",
  category: "Party",
  description: "Battle your friends as stick figures in fast-paced arenas filled with ridiculous weapons, physics-based chaos, and unpredictable combat.",
  platform: "PC / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/674940/header.jpg",
  url: "https://store.steampowered.com/app/674940/Stick_Fight_The_Game/"
},
     {
  title: "Gang Beasts",
  category: "Party",
  description: "Throw your friends around in ridiculous physics-based brawls across hazardous arenas filled with unpredictable obstacles.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/285900/header.jpg",
  url: "https://store.steampowered.com/app/285900/Gang_Beasts/"
},
     {
  title: "PICO PARK 2",
  category: "Party",
  description: "Team up with friends in cooperative puzzle stages that require teamwork, coordination, and clever problem-solving.",
  platform: "PC / Nintendo Switch / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/2644470/header.jpg",
  url: "https://store.steampowered.com/app/2644470/PICO_PARK_2/"
},
     {
  title: "Overcooked! All You Can Eat",
  category: "Party",
  description: "Work together in chaotic kitchens, prepare meals under pressure, and overcome ridiculous cooking challenges with friends.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1243830/header.jpg",
  url: "https://store.steampowered.com/app/1243830/Overcooked_All_You_Can_Eat/"
},
     {
  title: "Unrailed!",
  category: "Party",
  description: "Work together to build railway tracks across unpredictable landscapes, gather resources, and keep your train moving before it crashes.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1016920/header.jpg",
  url: "https://store.steampowered.com/app/1016920/Unrailed/"
},
     {
  title: "Heave Ho",
  category: "Party",
  description: "Grab your friends, swing across dangerous gaps, and try not to fall in this hilarious cooperative physics-based party game.",
  platform: "PC / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/905340/header.jpg",
  url: "https://store.steampowered.com/app/905340/Heave_Ho/"
},
     {
  title: "Boomerang Fu",
  category: "Party",
  description: "Battle your friends as adorable food characters, throwing boomerangs and using wild power-ups in fast-paced arena battles.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/965680/header.jpg",
  url: "https://store.steampowered.com/app/965680/Boomerang_Fu/"
},
     {
  title: "ROUNDS",
  category: "Party",
  description: "Battle your friends in fast-paced duels, unlock powerful upgrades, and create ridiculous combinations in physics-based combat.",
  platform: "PC",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1557740/header.jpg",
  url: "https://store.steampowered.com/app/1557740/ROUNDS/"
},
     {
  title: "PowerWash Simulator",
  category: "Simulation",
  description: "Relax and clean everything from houses to massive vehicles using powerful pressure washers, completing satisfying cleaning jobs.",
  platform: "PC / PlayStation / Xbox / Nintendo Switch",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1290000/header.jpg",
  url: "https://store.steampowered.com/app/1290000/PowerWash_Simulator/"
},
     {
  title: "Gas Station Simulator",
  category: "Simulation",
  description: "Restore an abandoned gas station, serve customers, manage supplies, expand your business, and build a successful roadside empire.",
  platform: "PC / PlayStation / Xbox",
  image: "https://cdn.akamai.steamstatic.com/steam/apps/1149620/header.jpg",
  url: "https://store.steampowered.com/app/1149620/Gas_Station_Simulator/"
},
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
     tag.textContent = game.original
  ? "NOCTURNE ORIGINAL"
  : game.playMode === "external"
    ? "FREE BROWSER GAME"
    : game.category;
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
    discover.textContent = game.playMode === "external"
  ? "PLAY ONLINE ↗"
  : "Discover ↗";

      discover.addEventListener("click", () => {
        if (game.playMode === "external" && game.url) {
         window.open(game.url, "_blank", "noopener,noreferrer");
        return;
      }

      openGameDetails(game);
     });

        if (!game.original) {
        const statsButton = document.createElement("button");
        statsButton.type = "button";
        statsButton.className = "nv-discover-button";
        statsButton.textContent = "Submit Statistics";

        statsButton.addEventListener("click", () => {
          submitGameStats(game);
        });

        info.append(title, description, meta, discover, statsButton);
      } else {
        info.append(title, description, meta, discover);
      }
      card.append(art, info);
      grid.appendChild(card);
    });
  }
   function showLevelUpNotification(newLevel) {
  const overlay = document.createElement("div");

  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 20000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
  `;

  const popup = document.createElement("div");

  popup.style.cssText = `
    width: 90%;
    max-width: 420px;
    padding: 40px 25px;
    text-align: center;
    color: white;
    background: linear-gradient(145deg, #170d25, #080b1c);
    border: 2px solid #a855ff;
    border-radius: 18px;
    box-shadow: 0 0 25px #7928ca, 0 0 60px rgba(0,140,255,.4);
    animation: nvLevelPop .5s ease;
  `;

  const heading = document.createElement("h1");
  heading.textContent = "LEVEL UP!";
  heading.style.cssText = `
    color: #c084fc;
    font-size: 38px;
    text-shadow: 0 0 15px #a855ff;
  `;

  const levelText = document.createElement("h2");
  levelText.textContent = `LEVEL ${newLevel}`;
  levelText.style.cssText = `
    color: #00c8ff;
    font-size: 32px;
    text-shadow: 0 0 15px #00c8ff;
  `;

  const message = document.createElement("p");
  message.textContent = "Your power in the VOID grows stronger.";

  const closeButton = document.createElement("button");
  closeButton.textContent = "CONTINUE";
  closeButton.style.cssText = `
    margin-top: 20px;
    padding: 12px 30px;
    color: white;
    background: linear-gradient(90deg, #7928ca, #245bdb);
    border: 1px solid #a855ff;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
  `;

  closeButton.addEventListener("click", () => overlay.remove());

  popup.append(heading, levelText, message, closeButton);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}
   
  async function submitGameStats(game) {
    if (!currentUser) {
      alert("Please sign in to submit game statistics.");
      return;
    }

    const wins = prompt("How many wins do you have?");
    if (wins === null) return;

    const losses = prompt("How many losses do you have?");
    if (losses === null) return;

    const gamesPlayed = prompt("How many games have you played?");
    if (gamesPlayed === null) return;

    const highScore = prompt("What is your highest score?");
    if (highScore === null) return;

    const values = [wins, losses, gamesPlayed, highScore];

    if (values.some(value =>
      !/^\d+$/.test(value.trim()) ||
      !Number.isSafeInteger(Number(value))
    )) {
      alert("Please enter valid non-negative whole numbers.");
      return;
    }
     
     const { data: previousStats, error: previousStatsError } =
  await supabaseClient
    .from("community_game_stats")
    .select("game_name, xp")
    .eq("user_id", currentUser.id);

if (previousStatsError) {
  console.error("Could not check previous XP:", previousStatsError);
  alert("Could not check your current XP. Please try again.");
  return;
}

const previousTotalXP = (previousStats || []).reduce(
  (sum, stat) => sum + (stat.xp || 0),
  0
);

const oldGameXP = (previousStats || [])
  .find(stat => stat.game_name === game.title)?.xp || 0;

const newTotalXP = previousTotalXP - oldGameXP + Number(wins) * 100;

const previousLevel = Math.floor(previousTotalXP / 1000) + 1;
const newLevel = Math.floor(newTotalXP / 1000) + 1;

    const { error } = await supabaseClient
      .from("community_game_stats")
      .upsert({
        user_id: currentUser.id,
        username: currentProfile?.username || "Player",
        game_name: game.title,
        wins: Number(wins),
        xp: Number(wins) * 100,
        losses: Number(losses),
        games_played: Number(gamesPlayed),
        high_score: Number(highScore),
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id,game_name"
      });

    if (error) {
      console.error("Game stats error:", error);
      alert("Could not save your statistics.");
      return;
    }
     await loadAccountAchievements();

if (newLevel > previousLevel) {
  showLevelUpNotification(newLevel);
} else {
  alert("Your game statistics have been saved!");
}
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

  const gameSelect = $("#gameLeaderboardSelect");

  if (gameSelect) {
    games.filter(game => !game.original).forEach(game => {
      const option = document.createElement("option");
      option.value = game.title;
      option.textContent = game.title;
      gameSelect.appendChild(option);
    });

    gameSelect.addEventListener("change", () => {
      loadGameLeaderboard(gameSelect.value);
    });
  }

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

  let leaderboardPlayers = [];
    async function loadCommunityLeaderboard() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("community_game_stats")
    .select("user_id, username, wins, losses, games_played, high_score");

  if (error) {
    console.error("Leaderboard loading error:", error);
    return;
  }

  const playerTotals = {};

  data.forEach(stat => {
    if (!playerTotals[stat.user_id]) {
      playerTotals[stat.user_id] = {
        name: stat.username,
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        highScore: 0
      };
    }

    playerTotals[stat.user_id].wins += stat.wins;
    playerTotals[stat.user_id].losses += stat.losses;
    playerTotals[stat.user_id].gamesPlayed += stat.games_played;

    playerTotals[stat.user_id].highScore = Math.max(
      playerTotals[stat.user_id].highScore,
      stat.high_score
    );
  });

  leaderboardPlayers = Object.values(playerTotals)
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 10)
    .map(player => ({
      name: player.name,
      level: player.wins >= 100 ? "Elite Player" :
             player.wins >= 25 ? "Veteran" : "Rising Player",
      score: player.wins,
      wins: player.wins,
      losses: player.losses,
      gamesPlayed: player.gamesPlayed,
      highScore: player.highScore
    }));
       
    renderLeaderboard();
  }
   async function loadGameLeaderboard(gameName) {
  const container = $("#gameLeaderRows");
  if (!container) return;

  container.replaceChildren();

  if (!gameName) {
    container.textContent = "Choose a game to view its rankings.";
    return;
  }

  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("community_game_stats")
    .select("username, wins, losses, games_played, high_score")
    .eq("game_name", gameName)
    .order("wins", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Game leaderboard error:", error);
    container.textContent = "Could not load rankings.";
    return;
  }

  if (!data.length) {
    container.textContent = "No statistics submitted for this game yet.";
    return;
  }

  data.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "leader-row";

    const rank = document.createElement("div");
    rank.className = "rank";
    rank.textContent = `#${index + 1}`;

    const name = document.createElement("div");
    name.className = "player";
    name.textContent = player.username;

    const stats = document.createElement("small");
    stats.textContent =
      `Losses: ${player.losses} | Games: ${player.games_played} | High Score: ${player.high_score}`;

    name.appendChild(stats);

    const score = document.createElement("div");
    score.className = "score";
    score.textContent = `${player.wins} WINS`;

    row.append(rank, name, score);
    container.appendChild(row);
  });
}
   
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
       const stats = document.createElement("small");
       stats.textContent =
           `Losses: ${player.losses} | Games: ${player.gamesPlayed} | High Score: ${player.highScore}`;
       name.appendChild(stats);

      const score = document.createElement("div");
      score.className = "score";
     score.textContent = `${player.score} WINS`;

      row.append(rank, name, score);
      container.appendChild(row);
    });
  }
   async function loadAccountAchievements() {
  const container = $("#accountAchievementsContent");
  if (!container || !currentUser || !supabaseClient) return;

  container.textContent = "Loading achievements...";

  const { data, error } = await supabaseClient
    .from("community_game_stats")
   .select("wins, losses, games_played, xp")
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Account achievements error:", error);
    container.textContent = "Could not load achievements.";
    return;
  }

  const totals = (data || []).reduce(
    (result, stat) => ({
      wins: result.wins + (stat.wins || 0),
      losses: result.losses + (stat.losses || 0),
      games: result.games + (stat.games_played || 0)
    }),
    { wins: 0, losses: 0, games: 0 }
  );

  const totalXP = (data || []).reduce(
  (sum, stat) => sum + (stat.xp || 0),
  0
);

  const achievements = [];

  if (totalXP >= 1000) achievements.push("💎 1,000 XP — Rising Star");
  if (totalXP >= 5000) achievements.push("🌟 5,000 XP — Powerhouse");
  if (totalXP >= 10000) achievements.push("👑 10,000 XP — Immortal");
  if (totalXP >= 50000) achievements.push("🌌 50,000 XP — Void Master");

  if (totals.wins >= 1) achievements.push("🏆 First Victory");
  if (totals.wins >= 25) achievements.push("⚔️ Veteran");
  if (totals.wins >= 100) achievements.push("🔥 Elite Player");
  if (totals.wins >= 500) achievements.push("👑 Legend");

  if (totals.games >= 1000) achievements.push("🎮 Dedicated Gamer");

  container.replaceChildren();

  if (achievements.length === 0) {
    container.textContent = "No achievements unlocked yet. Keep playing!";
    return;
  }

  achievements.forEach(achievement => {
    const item = document.createElement("p");
    item.textContent = achievement;
    container.appendChild(item);
  });
      const badgeNames = [];

if (totalXP >= 1000) badgeNames.push("💎 Rising Star");
if (totalXP >= 5000) badgeNames.push("🌟 Powerhouse");
if (totalXP >= 10000) badgeNames.push("👑 Immortal");
if (totals.wins >= 100) badgeNames.push("🔥 Elite Player");
if (totals.wins >= 500) badgeNames.push("🏆 Legend");

if (badgeNames.length === 0) {
  badgeNames.push("🎮 New Member");
}

badgeNames.forEach(badgeName => {
  const badge = document.createElement("span");

  badge.textContent = badgeName;

  badge.style.cssText = `
    padding: 8px 12px;
    background: #302044;
    border: 1px solid #713cff;
    border-radius: 20px;
    color: #d8c5ff;
    font-size: 12px;
  `;

  badgesList.appendChild(badge);
});
      
}
async function loadAccountGames() {
  const container = $("#accountGamesContent");
  if (!container || !currentUser || !supabaseClient) return;

  container.textContent = "Loading your games...";

  const { data, error } = await supabaseClient
    .from("community_game_stats")
    .select("game_name, wins, losses, games_played, high_score, xp")
    .eq("user_id", currentUser.id)
    .order("games_played", { ascending: false });

  if (error) {
    console.error("Account games error:", error);
    container.textContent = "Could not load your games.";
    return;
  }

  container.replaceChildren();

  if (!data || data.length === 0) {
    container.textContent = "You haven't played any games yet.";
    return;
  }

  data.forEach(game => {
    const card = document.createElement("div");
    card.className = "account-game-card";

    const name = document.createElement("h3");
    name.textContent = game.game_name;

    const stats = document.createElement("p");
    stats.textContent =
      `Wins: ${game.wins} | Losses: ${game.losses} | Games: ${game.games_played}`;

    const highScore = document.createElement("p");
    highScore.textContent = `High Score: ${game.high_score}`;

    card.append(name, stats, highScore);
    container.appendChild(card);
  });
}
   async function loadAccountFriends() {
  const container = $("#accountFriendsContent");
  if (!container || !currentUser || !supabaseClient) return;

  container.textContent = "Loading friends...";

  const { data: requests, error } = await supabaseClient
    .from("friend_requests")
    .select("*")
    .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

  if (error) {
    console.error("Friends loading error:", error);
    container.textContent = "Could not load friends.";
    return;
  }

  container.replaceChildren();

  const accepted = (requests || []).filter(
    request => request.status === "accepted"
  );

  const incoming = (requests || []).filter(
    request =>
      request.status === "pending" &&
      request.receiver_id === currentUser.id
  );

  const outgoing = (requests || []).filter(
    request =>
      request.status === "pending" &&
      request.sender_id === currentUser.id
  );

  const friendIds = [
    ...new Set([
      ...accepted.map(request =>
        request.sender_id === currentUser.id
          ? request.receiver_id
          : request.sender_id
      ),
      ...incoming.map(request => request.sender_id),
      ...outgoing.map(request => request.receiver_id)
    ])
  ];

  let profiles = [];

  if (friendIds.length) {
    const { data, error: profileError } = await supabaseClient
      .from("community_profiles")
      .select("id, username, avatar_url, custom_status, presence_status, created_at, last_seen")
      .in("id", friendIds);

    if (profileError) {
      console.error("Friend profiles error:", profileError);
    } else {
      profiles = data || [];
    }
  }

  const heading = document.createElement("h3");
  heading.textContent = "YOUR FRIENDS";
  container.appendChild(heading);

  if (!accepted.length) {
    const empty = document.createElement("p");
    empty.textContent = "You haven't added any friends yet.";
    container.appendChild(empty);
  }

  accepted.forEach(request => {
    const friendId =
      request.sender_id === currentUser.id
        ? request.receiver_id
        : request.sender_id;

    const profile = profiles.find(person => person.id === friendId);
    if (!profile) return;

    const item = document.createElement("p");
    item.textContent = `👤 ${profile.username}`;
    container.appendChild(item);
  });

  const requestsHeading = document.createElement("h3");
  requestsHeading.textContent = "FRIEND REQUESTS";
  container.appendChild(requestsHeading);

  if (!incoming.length && !outgoing.length) {
    const empty = document.createElement("p");
    empty.textContent = "No pending friend requests.";
    container.appendChild(empty);
  }

  incoming.forEach(request => {
    const profile = profiles.find(
      person => person.id === request.sender_id
    );

    const item = document.createElement("div");
    const name = document.createElement("span");
    name.textContent = `${profile?.username || "Unknown player"} `;

    const accept = document.createElement("button");
    accept.textContent = "Accept";

    accept.addEventListener("click", async () => {
      const { error } = await supabaseClient
        .from("friend_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", request.id);

      if (error) {
        console.error("Accept request error:", error);
        return;
      }

      loadAccountFriends();
    });

    const decline = document.createElement("button");
    decline.textContent = "Decline";

    decline.addEventListener("click", async () => {
      const { error } = await supabaseClient
        .from("friend_requests")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", request.id);

      if (error) {
        console.error("Decline request error:", error);
        return;
      }

      loadAccountFriends();
    });

    item.append(name, accept, decline);
    container.appendChild(item);
  });

  outgoing.forEach(request => {
    const profile = profiles.find(
      person => person.id === request.receiver_id
    );

    const item = document.createElement("p");
    item.textContent = `Request sent to ${profile?.username || "player"} — Pending`;
    container.appendChild(item);
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
   const accountButton = $("#accountButton");
const accountDropdown = $("#accountDropdown");
     
accountButton?.addEventListener("click", () => {
  if (!currentUser) {
    openAccountDialog();
    setAuthMode("login");
    return;
  }

  if (!accountDropdown) {
    console.error("Account dropdown element not found.");
    return;
  }

  const isOpen = !accountDropdown.hidden;

  accountDropdown.hidden = isOpen;
  accountButton.setAttribute("aria-expanded", String(!isOpen));
});

document.addEventListener("click", event => {
  if (
    !event.target.closest(".account-menu-wrapper") &&
    accountDropdown
  ) {
    accountDropdown.hidden = true;
    accountButton?.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && accountDropdown) {
    accountDropdown.hidden = true;
    accountButton?.setAttribute("aria-expanded", "false");
  }
});

$("#dropdownSignOut")?.addEventListener("click", () => {
  $("#logoutButton")?.click();
  accountDropdown.hidden = true;
  accountButton?.setAttribute("aria-expanded", "false");
});
     document.querySelectorAll("[data-account-page]").forEach(button => {
  button.addEventListener("click", () => {
    const selectedPage = button.dataset.accountPage;

    window.location.href = `account.html#${selectedPage}`;
  });
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

     const persistentPlayerMenu =
  $("#persistentPlayerMenu");

persistentPlayerMenu?.addEventListener("click", () => {
  if (!currentUser) {
    showStatus("Please sign in to access your player menu.", true);
    return;
  }

  showStatus("Player menu coming soon!");
});

const persistentPlayerProfile =
  $("#persistentPlayerProfile");

persistentPlayerProfile?.addEventListener("click", (event) => {
  if (event.target.closest("#persistentPlayerMenu")) return;

  if (!currentUser) {
    showStatus("Please sign in to access your player profile.", true);
    return;
  }

  showStatus("Player profile menu coming soon!");
});

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
    button.textContent = currentUser ? "My Account" : "Sign In";
  }

  if (logout) {
    logout.hidden = !currentUser;
  }

  if (!currentUser) {
    currentProfile = null;
  }
      updatePersistentPlayerProfile();

  renderAvatarProfile();
  renderCommunityMembers();

  if (currentUser) {
    loadAccountAchievements();
    loadAccountGames();
     loadAccountFriends();
  }

  if (currentUser && currentProfile) {
    const username = $("#accountUsername");
    const email = $("#accountEmail");
    const avatar = $("#accountAvatar");

    if (username) {
      username.textContent =
        currentProfile.username || currentUser.email || "Player";
    }

    if (email) {
      email.textContent = currentUser.email || "";
    }

    if (avatar && !currentProfile.avatar_url) {
      avatar.textContent =
        (currentProfile.username || "P").charAt(0).toUpperCase();
    }
  }
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
   const moderationHeading = document.createElement("h3");
moderationHeading.textContent = "Moderation Logs";

const moderationLogList = document.createElement("div");
moderationLogList.textContent = "Moderation activity will appear here.";

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
  moderationHeading,
  moderationLogList,
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
   async function loadModerationLogs() {
  moderationLogList.textContent = "Loading moderation logs...";

  try {
    const { data, error } = await supabaseClient
      .from("community_moderation_logs")
      .select("id, action, actor_id, target_user_id, target_message_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    moderationLogList.replaceChildren();

    if (!data || !data.length) {
      moderationLogList.textContent =
        "No moderation activity recorded yet.";
      return;
    }

    data.forEach(item => {
      const entry = document.createElement("div");
      entry.style.cssText =
        "padding:12px 0;border-bottom:1px solid #444;";

      const actor = communityProfiles.find(
        profile => profile.id === item.actor_id
      );

      const target = communityProfiles.find(
        profile => profile.id === item.target_user_id
      );

      const actionLabels = {
        message_deleted: "Message deleted",
        message_self_deleted: "Member deleted own message",
        member_banned: "Member banned",
        member_ban_updated: "Ban reason updated",
        member_unbanned: "Member unbanned",
        moderator_promoted: "Moderator promoted",
        moderator_removed: "Moderator removed"
      };

      const title = document.createElement("strong");
      title.textContent =
        actionLabels[item.action] || item.action;

      const description = document.createElement("p");
      description.textContent =
        `${actor ? getUsername(actor) : "Unknown staff/member"} → ${target ? getUsername(target) : "Unknown member"}`;

      const details = document.createElement("p");
      const detailParts = [];

      if (item.details?.channel) {
        detailParts.push(`Channel: ${item.details.channel}`);
      }

      if (item.details?.reason) {
        detailParts.push(`Reason: ${item.details.reason}`);
      }

      if (item.details?.message) {
        detailParts.push(`Message: ${item.details.message}`);
      }

      details.textContent = detailParts.join(" • ");

      const date = document.createElement("small");
      date.textContent =
        new Date(item.created_at).toLocaleString();

      entry.append(title, description);

      if (details.textContent) {
        entry.appendChild(details);
      }

      entry.appendChild(date);
      moderationLogList.appendChild(entry);
    });

  } catch (error) {
    console.error("Moderation log loading error:", error);
    moderationLogList.textContent =
      "Could not load moderation logs.";
  }
}

loadModerationLogs();
   
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
          <p class="hub-about-preview">
  Add something about yourself...
</p>
        <strong class="hub-profile-username">Guest</strong>
            <button
  class="hub-about-edit-button"
  type="button"
  disabled
>
  Edit About Me
</button>
            <button
    class="hub-custom-status-button"
    type="button"
    disabled
  >
    Set Custom Status
  </button>
           <select class="hub-presence-select" disabled>
  <option value="online">🟢 Online</option>
  <option value="idle">🌙 Idle</option>
  <option value="dnd">⛔ Do Not Disturb</option>
  <option value="invisible">⚫ Invisible</option>
</select>
             <button
                 class="hub-username-edit-button"
                type="button"
               disabled
             >
               Change Username
             </button>

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

     const aboutEditButton =
  $(".hub-about-edit-button", hub);

aboutEditButton?.addEventListener("click", async () => {
  if (!currentUser) return;

  const newAbout = prompt(
    "Tell the community about yourself (maximum 300 characters):",
    currentProfile?.about_me || ""
  );

  if (newAbout === null) return;

  const cleanedAbout = newAbout.trim();

  if (cleanedAbout.length > 300) {
    showStatus("About Me cannot exceed 300 characters.", true);
    return;
  }

  aboutEditButton.disabled = true;

  try {
    const { data, error } = await supabaseClient
      .from("community_profiles")
      .update({ about_me: cleanedAbout })
      .eq("id", currentUser.id)
      .select("id, username, avatar_url, created_at, last_seen, custom_status, presence_status, about_me")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Profile could not be updated.");

    currentProfile = data;

    communityProfiles = communityProfiles.map(profile =>
      profile.id === data.id ? data : profile
    );

    conversationProfiles = conversationProfiles.map(profile =>
      profile.id === data.id ? data : profile
    );

    renderAvatarProfile();
    renderCommunityMembers();

    showStatus("About Me updated!");

  } catch (error) {
    console.error("About Me update error:", error);
    showStatus(error.message || "Unable to update About Me.", true);

  } finally {
    aboutEditButton.disabled = !currentUser;
  }
});
     
         const customStatusButton =
      $(".hub-custom-status-button", hub);

    customStatusButton?.addEventListener("click", async () => {
      if (!currentUser) return;

      const newStatus = prompt(
        "Enter your custom status (maximum 80 characters):",
        currentProfile?.custom_status || ""
      );

      if (newStatus === null) return;

      const cleanedStatus = newStatus.trim();

      if (cleanedStatus.length > 80) {
        showStatus("Custom status cannot exceed 80 characters.", true);
        return;
      }

      customStatusButton.disabled = true;

      try {
        const { data, error } = await supabaseClient
          .from("community_profiles")
          .update({ custom_status: cleanedStatus })
          .eq("id", currentUser.id)
          .select("id, username, avatar_url, created_at, last_seen, custom_status, presence_status, about_me")
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Profile could not be updated.");

        currentProfile = data;

        communityProfiles = communityProfiles.map(profile =>
          profile.id === data.id ? data : profile
        );

        renderAvatarProfile();
        renderCommunityMembers();
        renderCommunityMessages();

        showStatus("Custom status updated!");

      } catch (error) {
        console.error("Custom status update error:", error);
        showStatus(error.message || "Unable to update status.", true);

      } finally {
        customStatusButton.disabled = !currentUser;
      }
    });

         const presenceSelect =
      $(".hub-presence-select", hub);

    if (presenceSelect) {
      presenceSelect.value =
        currentProfile?.presence_status || "online";

      presenceSelect.disabled = !currentUser;

      presenceSelect.addEventListener("change", async () => {
        if (!currentUser) return;

        presenceSelect.disabled = true;

        try {
          const { data, error } = await supabaseClient
            .from("community_profiles")
            .update({
              presence_status: presenceSelect.value
            })
            .eq("id", currentUser.id)
            .select("id, username, avatar_url, created_at, last_seen, custom_status, presence_status, about_me")
            .maybeSingle();

          if (error) throw error;
          if (!data) throw new Error("Presence status could not be updated.");

          currentProfile = data;

          communityProfiles = communityProfiles.map(profile =>
            profile.id === data.id ? data : profile
          );

          renderAvatarProfile();
          renderCommunityMembers();

          showStatus("Presence status updated!");

        } catch (error) {
          console.error("Presence update error:", error);
          showStatus("Unable to update presence status.", true);

          presenceSelect.value =
            currentProfile?.presence_status || "online";

        } finally {
          presenceSelect.disabled = !currentUser;
        }
      });
    }
     
     const usernameButton =
  $(".hub-username-edit-button", hub);

usernameButton?.addEventListener("click", async () => {
  if (!currentUser) {
    openAccountDialog();
    setAuthMode("login");
    return;
  }

  const newUsername = prompt(
    "Enter your new username:",
    getUsername(currentProfile || currentUser)
  );

  if (newUsername === null) return;

  const cleanedUsername = newUsername.trim();

  if (cleanedUsername.length < 3 || cleanedUsername.length > 24) {
    showStatus("Username must be between 3 and 24 characters.", true);
    return;
  }

  usernameButton.disabled = true;
  showStatus("Updating your username...");

  try {
    const userId = currentUser.id;

    const { data, error } = await supabaseClient
      .from("community_profiles")
      .update({ username: cleanedUsername })
      .eq("id", userId)
      .select("id, username, avatar_url")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        throw new Error("That username is already taken.");
      }
      throw error;
    }

    if (!data) {
      throw new Error("Your profile could not be updated.");
    }

    currentProfile = data;

    communityProfiles = communityProfiles.map(profile =>
      profile.id === userId ? data : profile
    );

    conversationProfiles = conversationProfiles.map(profile =>
      profile.id === userId ? data : profile
    );

    renderAvatarProfile();
    renderCommunityMembers();
    renderCommunityMessages();
    renderDirectMessageInbox();

    showStatus("Your username has been updated!");

  } catch (error) {
    console.error("Username update error:", error);
    showStatus(error.message || "Unable to update username.", true);

  } finally {
    usernameButton.disabled = !currentUser;
  }
});

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
       .select("id, username, avatar_url, created_at, last_seen, custom_status, presence_status, about_me")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      // Ignore outdated profile requests.
      if (!currentUser || currentUser.id !== userId) return;

      currentProfile = data;
      updatePersistentPlayerProfile();
       
      // Update the Account Center profile
      const accountUsername = $("#accountUsername");
      const accountEmail = $("#accountEmail");
      const accountAvatar = $("#accountAvatar");

      if (accountUsername) {
        accountUsername.textContent =
          data?.username || currentUser?.email || "Player";
      }

      if (accountEmail) {
        accountEmail.textContent =
          currentUser?.email || "No email available";
      }

      if (accountAvatar) {
        if (data?.avatar_url) {
          const avatarImage = document.createElement("img");
          avatarImage.src = data.avatar_url;
          avatarImage.alt = "Profile avatar";
          accountAvatar.replaceChildren(avatarImage);
        } else {
          accountAvatar.textContent =
            (data?.username || "P").charAt(0).toUpperCase();
        }
      }

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
        .select("id, username, avatar_url, created_at, last_seen, custom_status, presence_status, about_me")
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
   
async function openMemberProfile(profile) {
  const overlay = document.createElement("div");

  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(0,0,0,.8);
  `;

  const card = document.createElement("div");
   
  card.style.cssText = `
    width: 100%;
    max-width: 650px;
    max-height: 85vh;
    overflow-y: auto;
    padding: 30px;
    background: #12101a;
    border: 1px solid #713cff;
    border-radius: 16px;
    color: #fff;
    text-align: center;
    box-shadow: 0 0 35px rgba(113, 60, 255, .25);
  `;

  const avatar = makeAvatar(profile);
   
     const profileBanner = document.createElement("div");

  profileBanner.style.cssText = `
    height: 110px;
    margin: -30px -30px 20px;
    background: linear-gradient(
      135deg,
      #241044,
      #5425a8,
      #17102b
    );
    border-radius: 15px 15px 0 0;
  `;

    avatar.style.cssText += `
    width: 110px;
    height: 110px;
    margin: -75px auto 15px;
    position: relative;
    border: 5px solid #12101a;
    overflow: hidden;
    border-radius: 50%;
    background: #241044;
  `;

  const name = document.createElement("h2");
  name.textContent = getUsername(profile);

     const aboutSection = document.createElement("div");

  aboutSection.style.cssText = `
    margin: 20px 0;
    padding: 16px;
    background: #1c1728;
    border: 1px solid #35264f;
    border-radius: 10px;
    text-align: left;
  `;

  const aboutHeading = document.createElement("h3");
  aboutHeading.textContent = "ABOUT ME";

  const aboutText = document.createElement("p");
  aboutText.textContent =
    profile.about_me || "This member hasn't written an introduction yet.";

  aboutText.style.cssText = `
    color: #bbb;
    line-height: 1.6;
    margin-top: 8px;
  `;

  aboutSection.append(aboutHeading, aboutText);

  const status = document.createElement("p");

const selectedPresence =
  profile.presence_status || "online";

const isOnline =
  onlineMembers.has(profile.id) &&
  selectedPresence !== "invisible";

const visiblePresence =
  isOnline ? selectedPresence : "offline";

const presenceLabels = {
  online: "🟢 Online",
  idle: "🌙 Idle",
  dnd: "⛔ Do Not Disturb",
  offline: "⚫ Offline"
};

const presenceColors = {
  online: "#55cc88",
  idle: "#f0b84b",
  dnd: "#ed4245",
  offline: "#999"
};

status.textContent =
  presenceLabels[visiblePresence];

status.style.color =
  presenceColors[visiblePresence];
   

     const customStatus = document.createElement("p");

  customStatus.textContent = profile.custom_status || "No custom status set.";

  customStatus.style.cssText = `
    color: #b9a3e8;
    font-size: 13px;
    margin: 8px 0 15px;
  `;

  status.textContent = isOnline ? "● Online" : "● Offline";
  status.style.color = isOnline ? "#55cc88" : "#999";

  const joined = document.createElement("p");
  joined.textContent = profile.created_at
    ? `Joined: ${formatDate(profile.created_at)}`
    : "Join date unavailable";

  const lastSeen = document.createElement("p");
  lastSeen.textContent = isOnline
    ? "Currently active"
    : profile.last_seen
      ? `Last seen: ${formatDate(profile.last_seen)}`
      : "Last activity unavailable";
     const statsSection = document.createElement("div");

  statsSection.style.cssText = `
    margin: 20px 0;
    padding: 15px;
    background: #241d25;
    border-radius: 8px;
  `;
     const badgesSection = document.createElement("div");

  badgesSection.style.cssText = `
    margin: 20px 0;
    padding: 15px;
    background: #1c1728;
    border: 1px solid #35264f;
    border-radius: 10px;
  `;

  const badgesHeading = document.createElement("h3");
  badgesHeading.textContent = "PROFILE BADGES";

  const badgesList = document.createElement("div");

  badgesList.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin-top: 12px;
  `;

  badgesSection.append(badgesHeading, badgesList);
   
  const statsHeading = document.createElement("h3");
  statsHeading.textContent = "GAMING STATISTICS";

  statsSection.appendChild(statsHeading);
   const levelHeading = document.createElement("h3");
levelHeading.textContent = "PLAYER LEVEL";

const playerLevel = document.createElement("p");
playerLevel.style.cssText = `
  font-size: 20px;
  font-weight: bold;
  color: #c23b50;
`;

statsSection.append(levelHeading, playerLevel);

  if (supabaseClient) {
    const { data: gameStats, error: statsError } =
      await supabaseClient
        .from("community_game_stats")
        .select("game_name, wins, losses, games_played, high_score")
        .eq("user_id", profile.id);
     
         const { data: myGameStats } = await supabaseClient
      .from("community_game_stats")
      .select("game_name")
      .eq("user_id", currentUser.id);

    const myGameNames = new Set(
      (myGameStats || []).map(game => game.game_name)
    );

    const mutualGames = (gameStats || []).filter(game =>
      myGameNames.has(game.game_name)
    );

    const mutualGamesSection = document.createElement("div");

    mutualGamesSection.style.cssText = `
      margin: 20px 0;
      padding: 15px;
      background: #1c1728;
      border: 1px solid #35264f;
      border-radius: 10px;
      text-align: left;
    `;

    const mutualGamesHeading = document.createElement("h3");
    mutualGamesHeading.textContent = "GAMES YOU SHARE";

    mutualGamesSection.appendChild(mutualGamesHeading);

    if (mutualGames.length) {
      mutualGames.forEach(game => {
        const item = document.createElement("p");
        item.textContent = `🎮 ${game.game_name}`;
        mutualGamesSection.appendChild(item);
      });
    } else {
      const empty = document.createElement("p");
      empty.textContent = "You don't share any games yet.";
      mutualGamesSection.appendChild(empty);
    }
         statsSection.appendChild(mutualGamesSection);
     
         const mutualFriendsSection = document.createElement("div");

    mutualFriendsSection.style.cssText = `
      margin: 20px 0;
      padding: 15px;
      background: #1c1728;
      border: 1px solid #35264f;
      border-radius: 10px;
      text-align: left;
    `;

    const mutualFriendsHeading = document.createElement("h3");
    mutualFriendsHeading.textContent = "MUTUAL FRIENDS";

    mutualFriendsSection.appendChild(mutualFriendsHeading);

    const { data: myFriendRequests } = await supabaseClient
      .from("friend_requests")
      .select("sender_id, receiver_id")
      .eq("status", "accepted")
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

    const { data: theirFriendRequests } = await supabaseClient
      .from("friend_requests")
      .select("sender_id, receiver_id")
      .eq("status", "accepted")
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

    const getFriendIds = (requests, userId) =>
      (requests || []).map(request =>
        request.sender_id === userId
          ? request.receiver_id
          : request.sender_id
      );

    const myFriendIds = getFriendIds(myFriendRequests, currentUser.id);
    const theirFriendIds = getFriendIds(theirFriendRequests, profile.id);

    const mutualFriendIds = myFriendIds.filter(id =>
      theirFriendIds.includes(id) &&
      id !== currentUser.id &&
      id !== profile.id
    );

    if (mutualFriendIds.length) {
      const { data: mutualProfiles } = await supabaseClient
        .from("community_profiles")
        .select("id, username")
        .in("id", mutualFriendIds);

      (mutualProfiles || []).forEach(friend => {
        const item = document.createElement("p");
        item.textContent = `👤 ${friend.username}`;
        mutualFriendsSection.appendChild(item);
      });
    } else {
      const empty = document.createElement("p");
      empty.textContent = "No mutual friends yet.";
      mutualFriendsSection.appendChild(empty);
    }

    statsSection.appendChild(mutualFriendsSection);
     
     const gameRankings = [];

for (const game of gameStats || []) {
  const { data: ranking, error: rankingError } =
    await supabaseClient
      .from("community_game_stats")
      .select("user_id, wins")
      .eq("game_name", game.game_name)
      .gt("wins", game.wins);

  if (!rankingError) {
    gameRankings.push({
      gameName: game.game_name,
      rank: (ranking?.length || 0) + 1
    });
  }
}

    if (statsError) {
      console.error("Profile statistics error:", statsError);
    } else {
      const totals = (gameStats || []).reduce(
        (result, stat) => ({
          wins: result.wins + stat.wins,
          losses: result.losses + stat.losses,
          games: result.games + stat.games_played,
          highScore: Math.max(result.highScore, stat.high_score)
        }),
        { wins: 0, losses: 0, games: 0, highScore: 0 }
      );
       
const totalXP = (gameStats || []).reduce(
  (sum, stat) => sum + (stat.xp || 0),
  0
); 
       
const level = Math.floor(totalXP / 1000) + 1;

const xpIntoLevel = totalXP % 1000;
const xpProgress = (xpIntoLevel / 1000) * 100;

playerLevel.textContent = `LEVEL ${level}`;

const xpText = document.createElement("p");
xpText.textContent = `${totalXP.toLocaleString()} TOTAL XP`;
    
const xpProgressText = document.createElement("p");
xpProgressText.textContent =
  `${xpIntoLevel} / 1,000 XP to next level`;

const xpBar = document.createElement("div");
xpBar.style.cssText = `
  width: 100%;
  height: 12px;
  background: #383038;
  border-radius: 20px;
  overflow: hidden;
  margin: 10px 0;
`;

const xpFill = document.createElement("div");
xpFill.style.cssText = `
  width: ${xpProgress}%;
  height: 100%;
  background: #c23b50;
  border-radius: 20px;
  transition: width .4s ease;
`;

xpBar.appendChild(xpFill);
       xpText.style.cssText = `
  color: #c23b50;
  font-size: 18px;
  font-weight: bold;
  letter-spacing: 1px;
`;

xpProgressText.style.cssText = `
  color: #aaa;
  font-size: 12px;
  margin-top: 8px;
`;

statsSection.append(
  xpText,
  xpProgressText,
  xpBar
);
       const rankTitle = document.createElement("p");

if (level >= 50) {
  rankTitle.textContent = "👑 VOID LEGEND";
} else if (level >= 30) {
  rankTitle.textContent = "🔥 ELITE WARRIOR";
} else if (level >= 20) {
  rankTitle.textContent = "⚔️ MASTER PLAYER";
} else if (level >= 10) {
  rankTitle.textContent = "🛡️ VETERAN";
} else {
  rankTitle.textContent = "🎮 ROOKIE";
}

rankTitle.style.cssText = `
  color: #c23b50;
  font-weight: bold;
  letter-spacing: 2px;
  margin-top: 12px;
`;

statsSection.appendChild(rankTitle);

      const statsText = document.createElement("p");

      statsText.textContent =
        `Wins: ${totals.wins} | Losses: ${totals.losses} | Games: ${totals.games} | Highest Score: ${totals.highScore}`;

      statsSection.appendChild(statsText);
       const achievementsHeading = document.createElement("h3");
achievementsHeading.textContent = "ACHIEVEMENTS";

statsSection.appendChild(achievementsHeading);

const achievements = [];
       if (totalXP >= 1000) {
  achievements.push("💎 1,000 XP — Rising Star");
}

if (totalXP >= 5000) {
  achievements.push("🌟 5,000 XP — Powerhouse");
}

if (totalXP >= 10000) {
  achievements.push("👑 10,000 XP — Immortal");
}

if (totalXP >= 50000) {
  achievements.push("🌌 50,000 XP — Void Master");
}

if (totals.wins >= 1) {
  achievements.push("🏆 First Victory");
}

if (totals.wins >= 25) {
  achievements.push("⚔️ Veteran");
}

if (totals.wins >= 100) {
  achievements.push("🔥 Elite Player");
}

if (totals.wins >= 500) {
  achievements.push("👑 Legend");
}

if (totals.games >= 1000) {
  achievements.push("🎮 Dedicated Gamer");
}

if (achievements.length === 0) {
  achievements.push("No achievements unlocked yet.");
}

achievements.forEach(achievement => {
  const item = document.createElement("p");
  item.textContent = achievement;
  statsSection.appendChild(item);
});
       const favoriteHeading = document.createElement("h3");
favoriteHeading.textContent = "FAVORITE GAMES";

statsSection.appendChild(favoriteHeading);
       const rankingsHeading = document.createElement("h3");
rankingsHeading.textContent = "GAME RANKINGS";

statsSection.appendChild(rankingsHeading);

gameRankings.forEach(game => {
  const rankingText = document.createElement("p");

  rankingText.textContent =
    `${game.gameName} — #${game.rank}`;

  statsSection.appendChild(rankingText);
});

const favoriteGames = [...(gameStats || [])]
  .sort((a, b) => b.games_played - a.games_played)
  .slice(0, 3);

if (favoriteGames.length === 0) {
  const noGames = document.createElement("p");
  noGames.textContent = "No favorite games yet.";
  statsSection.appendChild(noGames);
} else {
  favoriteGames.forEach(game => {
    const gameName = document.createElement("p");
    gameName.textContent =
      `${game.game_name} — ${game.games_played} games played`;

    statsSection.appendChild(gameName);
  });
    }
  }
  }
   const friendButton = document.createElement("button");
friendButton.textContent = "Add Friend";
friendButton.type = "button";

friendButton.style.cssText = `
  padding: 10px 16px;
  margin: 12px 5px 0;
  color: white;
  background: #315b43;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
`;

friendButton.addEventListener("click", async () => {
  if (!currentUser || !supabaseClient) return;

  friendButton.disabled = true;
  friendButton.textContent = "Sending...";

  const { error } = await supabaseClient
    .from("friend_requests")
    .insert({
      sender_id: currentUser.id,
      receiver_id: profile.id
    });

  if (error) {
    console.error("Friend request error:", error);
    friendButton.textContent = "Request Failed";
    friendButton.disabled = false;
    return;
  }

  friendButton.textContent = "Request Sent";
});
   
  const messageButton = document.createElement("button");
  messageButton.textContent = "Send Private Message";
  messageButton.type = "button";

  messageButton.style.cssText = `
    padding: 10px 16px;
    margin: 12px 5px 0;
    color: white;
    background: #771d2b;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
  `;

  messageButton.addEventListener("click", () => {
    overlay.remove();
    openDirectMessage(profile);
  });

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.type = "button";

  closeButton.style.cssText = `
    padding: 10px 16px;
    margin: 12px 5px 0;
    color: white;
    background: #383238;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
  `;

  closeButton.addEventListener("click", () => {
    overlay.remove();
  });

  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      overlay.remove();
    }
  });

  card.append(
    profileBanner,
    avatar,
    name,
    aboutSection,
   badgesSection,
    status,
   customStatus,
    joined,
    lastSeen,
    statsSection,
     friendButton,
    messageButton,
    closeButton
  );

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}
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

             const memberStatus = document.createElement("small");
      memberStatus.className = "hub-member-custom-status";
      memberStatus.textContent = profile.custom_status || "";

      const dot = document.createElement("span");
      dot.className = "hub-online-dot";

      const selectedPresence =
  profile.presence_status || "online";

const isOnline =
  onlineMembers.has(profile.id) &&
  selectedPresence !== "invisible";

const visiblePresence =
  isOnline ? selectedPresence : "offline";

dot.classList.toggle(
  "is-online",
  visiblePresence === "online"
);

dot.classList.toggle(
  "is-idle",
  visiblePresence === "idle"
);

dot.classList.toggle(
  "is-dnd",
  visiblePresence === "dnd"
);

dot.title =
  visiblePresence === "dnd"
    ? "Do Not Disturb"
    : visiblePresence.charAt(0).toUpperCase() +
      visiblePresence.slice(1);

     member.append(avatar, name, memberStatus, dot);
       
  member.addEventListener("click", () => {
    openMemberProfile(profile);
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
   
function initializeNeonParticles() {
  if (document.querySelector(".nv-particles")) return;

  const particleLayer = document.createElement("div");
  particleLayer.className = "nv-particles";
  particleLayer.setAttribute("aria-hidden", "true");

  for (let i = 0; i < 35; i++) {
    const particle = document.createElement("span");
    particle.className = "nv-particle";

    particle.style.left = `${(i * 37) % 100}%`;
    particle.style.top = `${(i * 61) % 100}%`;
    particle.style.animationDelay = `${(i % 10) * -1.5}s`;
    particle.style.animationDuration = `${8 + (i % 8)}s`;

    particleLayer.appendChild(particle);
  }

  document.body.appendChild(particleLayer);
}
 function initializeMainNotifications() {
  mainNotificationBell = document.getElementById("mainNotificationBell");
  mainNotificationCount = document.getElementById("mainNotificationCount");
  mainNotificationPanel = document.getElementById("mainNotificationPanel");
  mainNotificationList = document.getElementById("mainNotificationList");

  if (!mainNotificationBell) return;

  mainNotificationBell.addEventListener("click", async () => {
    mainNotificationPanel.hidden = !mainNotificationPanel.hidden;

    if (!mainNotificationPanel.hidden) {
      await loadMainNotifications();
    }
  });
}

async function loadMainNotifications() {
  if (!supabaseClient || !mainNotificationList) return;

  const { data: sessionData } = await supabaseClient.auth.getSession();
  const user = sessionData.session?.user;

  if (!user) {
    mainNotificationList.textContent = "Sign in to view notifications.";
    mainNotificationCount.textContent = "0";
    return;
  }

  const { data: notifications, error } = await supabaseClient
    .from("void_live_notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Could not load notifications:", error);
    mainNotificationList.textContent = "Could not load notifications.";
    return;
  }

  const unreadCount = notifications.filter(item => !item.is_read).length;
  mainNotificationCount.textContent = unreadCount;

  mainNotificationList.innerHTML = "";

  if (notifications.length === 0) {
    mainNotificationList.textContent = "No notifications yet.";
    return;
  }

 notifications.forEach(notification => {
  const item = document.createElement("button");

  item.textContent = notification.message;
  item.className = notification.is_read
    ? "notification-item"
    : "notification-item unread";

  item.addEventListener("click", async () => {
    if (!notification.is_read) {
      await supabaseClient
        .from("void_live_notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      await loadMainNotifications();
    }

    window.location.href =
      "watch-stream.html?id=" + encodeURIComponent(notification.stream_id);
  });

  mainNotificationList.appendChild(item);
});
   
} 

 function initializeWebsite() {
    initializeAccountButtons();
    initializeMainNotifications();
    initializeNeonParticles();

    connectSupabase();
    loadAccountAchievements();
    loadMainNotifications();
setInterval(loadMainNotifications, 30000);

    initializeGameLibrary();
    loadCommunityLeaderboard();

    initializeCommunity();

// Connect the Account Center messaging buttons
const accountMessages = $(".account-dm-layout");

if (accountMessages) {
  $(".hub-composer", accountMessages)?.addEventListener(
    "submit",
    handleComposerSubmit
  );

  $(".hub-back-button", accountMessages)?.addEventListener(
    "click",
    showInboxView
  );

  $(".hub-inbox-button", accountMessages)?.addEventListener(
    "click",
    showInboxView
  );
}

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

/* ==============================
   NOCTURNE VOID LOADING SYSTEM
============================== */

(() => {
  const loadingScreen = document.getElementById("nv-loading-screen");
  const progressBar = document.getElementById("nv-loading-progress");
  const message = document.getElementById("nv-loading-quote");
  const status = document.getElementById("nv-loading-status");

  if (!loadingScreen || !progressBar || !message || !status) return;

  const loadingMessages = [
    "The VOID remembers everything.",
    "Legends aren't born. They're forged.",
    "Beyond the darkness lies another world.",
    "Not all who enter find their way back.",
    "Your next adventure awaits.",
    "Power is earned, never given.",
    "TIP: Add friends to expand your network.",
    "TIP: Climb the leaderboards and earn your place.",
    "TIP: Participate in the community to build your reputation.",
    "TIP: Explore the game library and discover something new."
  ];

  function randomMessage() {
    const index = Math.floor(Math.random() * loadingMessages.length);
    message.textContent = loadingMessages[index];
  }

  randomMessage();

  const messageInterval = setInterval(randomMessage, 3500);

  let progress = 0;

  const progressInterval = setInterval(() => {
    if (progress < 90) {
      progress += Math.random() * 5;
      progress = Math.min(progress, 90);
      progressBar.style.width = `${progress}%`;
    }
  }, 250);
   
   let hasFinishedLoading = false;
  function finishLoading() {
     
     if (hasFinishedLoading) return;
hasFinishedLoading = true;
    clearInterval(progressInterval);

    progressBar.style.width = "100%";
    status.textContent = "WELCOME TO THE VOID";

    setTimeout(() => {
      loadingScreen.style.transition = "opacity .8s ease";
      loadingScreen.style.opacity = "0";
      loadingScreen.style.pointerEvents = "none";

      setTimeout(() => {
        loadingScreen.remove();
        clearInterval(messageInterval);
      }, 850);

    }, 500);
  }

  if (document.readyState === "complete") {
    finishLoading();
  } else {
    window.addEventListener("load", finishLoading, { once: true });
  }
   // Backup: never leave visitors stuck loading
setTimeout(finishLoading, 12000);
})();
