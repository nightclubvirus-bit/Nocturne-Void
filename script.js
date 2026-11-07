
/* ==========================================
   NOCTURNE VOID
   COMPLETE WEBSITE SCRIPT
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

  const COMMUNITY_STORAGE_KEY = "nv-community-channels";

  let supabaseClient = null;
  let currentUser = null;
  let activeChannel = "general";
  let activeFilter = "All";

  /* ==========================================
     2. HELPERS
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

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function getInitial(value) {
    return String(value || "?").trim().charAt(0).toUpperCase();
  }

  /* ==========================================
     3. SUPABASE CONNECTION
     ========================================== */

  function connectSupabase() {
    if (!window.supabase || !window.supabase.createClient) {
      console.error("Supabase library could not be loaded.");
      showStatus("Account services could not load. Refresh the page.", true);
      return;
    }

    if (!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")) {
      console.error("Supabase publishable key is missing.");
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
     4. GAME LIBRARY
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

    const searchInput = $("#gameSearch");
    const searchTerm = searchInput
      ? searchInput.value.trim().toLowerCase()
      : "";

    const filteredGames = games.filter(game => {
      const matchesSearch =
        game.title.toLowerCase().includes(searchTerm) ||
        game.description.toLowerCase().includes(searchTerm) ||
        game.category.toLowerCase().includes(searchTerm);

      const matchesFilter =
        activeFilter === "All" || game.category === activeFilter;

      return matchesSearch && matchesFilter;
    });

    grid.replaceChildren();

    if (filteredGames.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No games found. Try another search.";
      grid.appendChild(empty);
      return;
    }

    filteredGames.forEach(game => {
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
    const search = $("#gameSearch");

    if (search) {
      search.addEventListener("input", renderGames);
    }

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
     5. LEADERBOARD
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
     6. ACCOUNT DIALOG
     ========================================== */

  const accountDialog = $("#accountDialog");

  let authMode = "login";
  let resetMode = false;

  function openAccountDialog() {
    if (!accountDialog) return;

    if (typeof accountDialog.showModal === "function") {
      if (!accountDialog.open) accountDialog.showModal();
    } else {
      accountDialog.setAttribute("open", "");
    }
  }

  function closeAccountDialog() {
    if (!accountDialog) return;

    if (typeof accountDialog.close === "function") {
      accountDialog.close();
    } else {
      accountDialog.removeAttribute("open");
    }
  }

  function setAuthMode(mode) {
    authMode = mode;
    resetMode = false;

    const form = $("#accountForm");
    const title = $("#accountTitle");
    const description = $("#accountDescription");
    const usernameLabel = $("#usernameLabel");
    const tabs = $("#authTabs");

    if (form) form.hidden = false;
    if (tabs) tabs.hidden = false;

    const resetForm = $("#resetPasswordForm");
    if (resetForm) resetForm.remove();

    if (title) {
      title.textContent = mode === "signup"
        ? "Create Your Account"
        : "Welcome Back";
    }

    if (description) {
      description.textContent = mode === "signup"
        ? "Join the world of Nocturne Void."
        : "Enter the darkness and continue your journey.";
    }

    if (usernameLabel) {
      usernameLabel.hidden = mode !== "signup";
    }

    const submit = $("#accountSubmit");
    if (submit) {
      submit.textContent = mode === "signup"
        ? "Create Account"
        : "Sign In";
    }

    const password = $("#accountPassword");
    if (password) {
      password.autocomplete = mode === "signup"
        ? "new-password"
        : "current-password";
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

  function updateAccountUI(user) {
    currentUser = user || null;

    const accountButton = $("#accountButton");
    const logoutButton = $("#logoutButton");
    const usernameLabel = $("#usernameLabel");
    const profileStatus = $("#profileStatus");

    if (accountButton) {
      accountButton.textContent = currentUser
        ? "My Account"
        : "Sign In";
    }

    if (logoutButton) {
      logoutButton.hidden = !currentUser;
    }

    if (usernameLabel) {
      usernameLabel.hidden = currentUser || authMode !== "signup";
    }

    if (profileStatus && currentUser) {
      profileStatus.textContent =
        `Signed in as ${currentUser.email}`;
    }

    refreshCommunityMembers();
  }

  function initializeAccountButtons() {
    const accountButton = $("#accountButton");

    if (accountButton) {
      accountButton.addEventListener("click", () => {
        if (currentUser) {
          openAccountDialog();
          showStatus(`Signed in as ${currentUser.email}`);
        } else {
          setAuthMode("login");
          openAccountDialog();
        }
      });
    }

    const tabs = $("#authTabs");

    if (tabs) {
      tabs.addEventListener("click", event => {
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
    }

    if (accountDialog) {
      accountDialog.addEventListener("click", event => {
        if (event.target === accountDialog) {
          closeAccountDialog();
        }
      });
    }

    const accountForm = $("#accountForm");

    if (accountForm) {
      accountForm.addEventListener("submit", handleAccountSubmit);

      const forgotButton = document.createElement("button");
      forgotButton.type = "button";
      forgotButton.className = "forgot-password";
      forgotButton.textContent = "Forgot your password?";
      forgotButton.addEventListener("click", handleForgotPassword);

      accountForm.appendChild(forgotButton);
    }

    const logoutButton = $("#logoutButton");

    if (logoutButton) {
      logoutButton.addEventListener("click", handleLogout);
    }

    setAuthMode("login");
  }

  /* ==========================================
     7. SIGNUP AND LOGIN
     ========================================== */

  async function handleAccountSubmit(event) {
    event.preventDefault();

    if (!supabaseClient) {
      showStatus("Account services are unavailable. Refresh the page.", true);
      return;
    }

    const username = $("#playerName")?.value.trim() || "";
    const email = $("#accountEmail")?.value.trim() || "";
    const password = $("#accountPassword")?.value || "";

    if (!email || !password) {
      showStatus("Please enter your email and password.", true);
      return;
    }

    if (authMode === "signup" && !username) {
      showStatus("Please choose a username.", true);
      return;
    }

    if (password.length < 6) {
      showStatus("Your password must contain at least 6 characters.", true);
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
            data: {
              username
            }
          }
        });

        if (error) throw error;

        if (data.session) {
          showStatus("Account created successfully!");
        } else {
          showStatus("Account created! Check your email for the confirmation link.");
        }
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        showStatus("You are now signed in!");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      showStatus(error.message || "Something went wrong. Please try again.", true);
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = authMode === "signup"
          ? "Create Account"
          : "Sign In";
      }
    }
  }

  /* ==========================================
     8. PASSWORD RECOVERY
     ========================================== */

  async function handleForgotPassword() {
    if (!supabaseClient) {
      showStatus("Account services are unavailable.", true);
      return;
    }

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
      console.error("Password reset error:", error);
      showStatus(error.message || "Unable to send reset email.", true);
    }
  }

  function showPasswordUpdateForm() {
    if (!accountDialog) return;

    resetMode = true;

    const accountForm = $("#accountForm");
    const tabs = $("#authTabs");

    if (accountForm) accountForm.hidden = true;
    if (tabs) tabs.hidden = true;

    setText("accountTitle", "Create a New Password");
    setText("accountDescription", "Choose a new password for your account.");

    let resetForm = $("#resetPasswordForm");

    if (!resetForm) {
      resetForm = document.createElement("form");
      resetForm.id = "resetPasswordForm";

      resetForm.innerHTML = `
        <label>
          New Password
          <input
            id="newPassword"
            type="password"
            minlength="6"
            autocomplete="new-password"
            required
          >
        </label>

        <label>
          Confirm New Password
          <input
            id="confirmNewPassword"
            type="password"
            minlength="6"
            autocomplete="new-password"
            required
          >
        </label>

        <button class="button button-primary" type="submit">
          Update Password
        </button>
      `;

      accountDialog.appendChild(resetForm);

      resetForm.addEventListener("submit", async event => {
        event.preventDefault();

        const password = $("#newPassword")?.value || "";
        const confirm = $("#confirmNewPassword")?.value || "";

        if (password.length < 6) {
          showStatus("Password must be at least 6 characters.", true);
          return;
        }

        if (password !== confirm) {
          showStatus("Your passwords do not match.", true);
          return;
        }

        showStatus("Updating your password...");

        try {
          const { error } = await supabaseClient.auth.updateUser({
            password
          });

          if (error) throw error;

          showStatus("Password updated successfully!");
          resetForm.remove();
          resetMode = false;

          if ($("#accountForm")) {
            $("#accountForm").hidden = false;
          }

          if ($("#authTabs")) {
            $("#authTabs").hidden = false;
          }

          setAuthMode("login");
        } catch (error) {
          console.error("Password update error:", error);
          showStatus(error.message || "Unable to update password.", true);
        }
      });
    }

    openAccountDialog();
  }

  /* ==========================================
     9. LOGOUT
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
      console.error("Logout error:", error);
      showStatus(error.message || "Unable to sign out.", true);
    }
  }

  /* ==========================================
     10. AUTHENTICATION INITIALIZATION
     ========================================== */

  function initializeAuthentication() {
    if (!supabaseClient) return;

    supabaseClient.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null;

      updateAccountUI(user);

      if (event === "PASSWORD_RECOVERY") {
        setTimeout(showPasswordUpdateForm, 0);
      }
    });

    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Session error:", error);
        return;
      }

      updateAccountUI(data.session?.user || null);

      const hash = window.location.hash;

      if (hash.includes("type=recovery")) {
        showPasswordUpdateForm();
      }
    });
  }

  /* ==========================================
     11. COMMUNITY CHANNELS
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

  function loadCommunityMessages() {
    try {
      const saved = localStorage.getItem(COMMUNITY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Could not load community messages:", error);
      return {};
    }
  }

  let communityMessages = loadCommunityMessages();

  function saveCommunityMessages() {
    try {
      localStorage.setItem(
        COMMUNITY_STORAGE_KEY,
        JSON.stringify(communityMessages)
      );
    } catch (error) {
      console.error("Could not save community messages:", error);
    }
  }

  function initializeCommunity() {
    const communitySection = $("#community");

    if (!communitySection) return;

    const existingHub = $(".community-hub", communitySection);
    if (existingHub) return;

    const hub = document.createElement("div");
    hub.className = "community-hub";

    hub.innerHTML = `
      <aside class="hub-sidebar">
        <div class="hub-server-name">NOCTURNE VOID</div>

        <div class="hub-category">COMMUNITY</div>

        <div class="hub-channels"></div>
      </aside>

      <main class="hub-main">
        <header class="hub-header">
          <h3 class="hub-channel-title"># general</h3>
          <p class="hub-channel-description"></p>
        </header>

        <div class="hub-messages"></div>

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

    communitySection.appendChild(hub);

    renderCommunityChannels();
    renderCommunityMessages();
    refreshCommunityMembers();

    const composer = $(".hub-composer", hub);

    if (composer) {
      composer.addEventListener("submit", handleCommunityMessage);
    }
  }

  function renderCommunityChannels() {
    const container = $(".hub-channels");
    if (!container) return;

    container.replaceChildren();

    channels.forEach(channel => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hub-channel";
      button.classList.toggle("active", channel.id === activeChannel);
      button.dataset.channel = channel.id;

      const icon = document.createElement("span");
      icon.textContent = "#";

      const label = document.createElement("span");
      label.textContent = channel.name;

      button.append(icon, label);

      button.addEventListener("click", () => {
        activeChannel = channel.id;
        renderCommunityChannels();
        renderCommunityMessages();
      });

      container.appendChild(button);
    });

    const active = channels.find(channel => channel.id === activeChannel);

    setText("unused", "");

    const title = $(".hub-channel-title");
    const description = $(".hub-channel-description");

    if (title) title.textContent = `# ${active.name.toLowerCase()}`;
    if (description) description.textContent = active.description;
  }

  /* ==========================================
     12. COMMUNITY MESSAGE DISPLAY
     ========================================== */

  function renderCommunityMessages() {
    const container = $(".hub-messages");
    if (!container) return;

    container.replaceChildren();

    const messages = communityMessages[activeChannel] || [];

    if (messages.length === 0) {
      const welcome = document.createElement("div");
      welcome.className = "hub-welcome";
      welcome.textContent =
        "Welcome to this channel. Be respectful, meet other players, and enjoy your time in Nocturne Void.";

      container.appendChild(welcome);
      return;
    }

    messages.forEach(message => {
      const row = document.createElement("div");
      row.className = "hub-message";

      const avatar = document.createElement("div");
      avatar.className = "hub-avatar";
      avatar.textContent = getInitial(message.username);

      const content = document.createElement("div");
      content.className = "hub-message-content";

      const top = document.createElement("div");
      top.className = "hub-message-top";

      const name = document.createElement("span");
      name.className = "hub-message-name";
      name.textContent = message.username;

      const time = document.createElement("span");
      time.className = "hub-message-time";

      const date = new Date(message.createdAt);
      time.textContent = Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleString();

      const text = document.createElement("div");
      text.className = "hub-message-text";
      text.textContent = message.text;

      top.append(name, time);
      content.append(top, text);
      row.append(avatar, content);
      container.appendChild(row);
    });

    container.scrollTop = container.scrollHeight;
  }

  /* ==========================================
     13. SEND COMMUNITY MESSAGE
     ========================================== */

  function handleCommunityMessage(event) {
    event.preventDefault();

    const input = $(".hub-message-input");
    if (!input) return;

    if (!currentUser) {
      openAccountDialog();
      setAuthMode("login");
      showStatus("Please sign in before sending a message.");
      return;
    }

    const messageText = input.value.trim();

    if (!messageText) return;

    const username =
      currentUser.user_metadata?.username ||
      currentUser.email?.split("@")[0] ||
      "Player";

    if (!communityMessages[activeChannel]) {
      communityMessages[activeChannel] = [];
    }

    communityMessages[activeChannel].push({
      username,
      text: messageText,
      createdAt: new Date().toISOString()
    });

    communityMessages[activeChannel] =
      communityMessages[activeChannel].slice(-100);

    saveCommunityMessages();

    input.value = "";
    renderCommunityMessages();
  }

  /* ==========================================
     14. COMMUNITY MEMBER LIST
     ========================================== */

  function refreshCommunityMembers() {
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

    const username =
      currentUser.user_metadata?.username ||
      currentUser.email?.split("@")[0] ||
      "Player";

    const member = document.createElement("div");
    member.className = "hub-member";

    const avatar = document.createElement("span");
    avatar.className = "hub-member-avatar";
    avatar.textContent = getInitial(username);

    const name = document.createElement("span");
    name.textContent = username;

    const dot = document.createElement("span");
    dot.className = "hub-online-dot";

    member.append(avatar, name, dot);
    container.appendChild(member);
  }

  /* ==========================================
     15. MOBILE NAVIGATION
     ========================================== */

  function initializeMobileNavigation() {
    const toggle = $("#menuToggle");
    const nav = $("#mainNav");

    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");

      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.textContent = isOpen ? "✕" : "☰";
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
     16. FOOTER YEAR
     ========================================== */

  function initializeFooter() {
    const year = new Date().getFullYear();

    setText("year", year);
    setText("footerYear", year);
  }

  /* ==========================================
     17. START WEBSITE
     ========================================== */

  function initializeWebsite() {
    initializeGameLibrary();
    renderLeaderboard();
    initializeAccountButtons();
    initializeCommunity();
    initializeMobileNavigation();
    initializeFooter();
    connectSupabase();

    console.log("NOCTURNE VOID website initialized.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeWebsite);
  } else {
    initializeWebsite();
  }

})();
