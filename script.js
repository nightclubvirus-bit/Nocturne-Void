
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

    if (notificationAudioContext.state === "suspended") {
      notificationAudioContext.resume().catch(console.warn);
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
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "Elden Ring",
      category: "Adventure",
      description: "Explore a mysterious world filled with ancient secrets and powerful enemies.",
      platform: "PC / Console",
      image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "Resident Evil",
      category: "Horror",
      description: "Survive terrifying encounters in a world where danger waits around every corner.",
      platform: "PC / Console",
      image: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "Dark Souls III",
      category: "Action",
      description: "Face unforgiving challenges in a dark fantasy world.",
      platform: "PC / Console",
      image: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "The Witcher 3",
      category: "Adventure",
      description: "Discover a vast fantasy world filled with monsters, magic, and choices.",
      platform: "PC / Console",
      image: "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "Dead by Daylight",
      category: "Horror",
      description: "Escape the nightmare or become the thing everyone fears.",
      platform: "PC / Console",
      image: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=900&q=80"
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
      tag.textContent = game.category;
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
      info.append(title, description, meta);
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
      description: "Talk about anything and everything."
    },
    {
      id: "introductions",
      name: "Introductions",
      description: "Introduce yourself to the community."
    },
    {
      id: "gaming",
      name: "Gaming",
      description: "Discuss your favorite games."
    },
    {
      id: "looking-for-group",
      name: "Looking for Group",
      description: "Find other players to game with."
    },
    {
      id: "media",
      name: "Media",
      description: "Share gaming clips, screenshots, and artwork."
    }
  ];

  /* ==========================================
     16. BUILD COMMUNITY INTERFACE
     ========================================== */

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

    channels.forEach(channel => {
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

  async function loadCommunityProfiles() {
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
    initializeCommunity();

    initializeMobileNavigation();
    initializeFooter();

    connectSupabase();

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
