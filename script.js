
/* ==========================================
   NOCTURNE VOID
   COMPLETE WEBSITE SCRIPT
   SUPABASE COMMUNITY EDITION
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

  let supabaseClient = null;
  let currentUser = null;
  let currentProfile = null;

  let activeChannel = "general";
  let activeFilter = "All";

  let communitySubscription = null;
  let presenceSubscription = null;

  let communityMessages = [];
  let communityProfiles = [];
  let onlineMembers = new Set();

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

  /* ==========================================
     3. SUPABASE CONNECTION
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

    const search = $("#gameSearch");
    const term = search ? search.value.trim().toLowerCase() : "";

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

  function openAccountDialog() {
    if (!accountDialog) return;

    if (!accountDialog.open) {
      accountDialog.showModal();
    }
  }

  function closeAccountDialog() {
    if (!accountDialog) return;

    if (accountDialog.open) {
      accountDialog.close();
    }
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
          `Signed in as ${currentProfile?.username || currentUser.email}`
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
      if (event.target === accountDialog) {
        closeAccountDialog();
      }
    });

    $("#accountForm")?.addEventListener(
      "submit",
      handleAccountSubmit
    );

    const form = $("#accountForm");

    if (form) {
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
     7. SIGNUP AND LOGIN
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
      showStatus("Password must contain at least 8 characters.", true);
      return;
    }

    if (username.length > 18) {
      showStatus("Username must be 18 characters or fewer.", true);
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

        if (data.session) {
          showStatus("Account created successfully!");
        } else {
          showStatus(
            "Account created! Check your email for confirmation."
          );
        }

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
     8. PASSWORD RECOVERY
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

    $("#accountForm").hidden = true;
    $("#authTabs").hidden = true;

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
          showStatus("Password must be at least 8 characters.", true);
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
          $("#accountForm").hidden = false;
          $("#authTabs").hidden = false;

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
      console.error(error);
      showStatus(error.message, true);
    }
  }

  /* ==========================================
     10. AUTHENTICATION
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
          loadCurrentProfile();
          loadCommunityMessages();
          loadCommunityProfiles();
          startPresence();
        }, 0);
      } else {
        currentProfile = null;
        onlineMembers.clear();

        stopCommunitySubscriptions();
        renderCommunityMembers();
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
        startPresence();
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

    renderCommunityMembers();
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

  function initializeCommunity() {
    const section = $("#community");

    if (!section || $(".community-hub", section)) return;

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

    renderCommunityChannels();
    renderCommunityMessages();
    renderCommunityMembers();

    $(".hub-composer", hub)?.addEventListener(
      "submit",
      handleCommunityMessage
    );

    const input = $(".hub-message-input", hub);

    if (input) {
      input.addEventListener("focus", () => {
        if (!currentUser) {
          input.placeholder = "Sign in to send a message...";
        }
      });
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
      button.dataset.channel = channel.id;
      button.classList.toggle(
        "active",
        channel.id === activeChannel
      );

      const icon = document.createElement("span");
      icon.textContent = "#";

      const label = document.createElement("span");
      label.textContent = channel.name;

      button.append(icon, label);

      button.addEventListener("click", () => {
        activeChannel = channel.id;

        renderCommunityChannels();
        loadCommunityMessages();
      });

      container.appendChild(button);
    });

    const active = channels.find(
      channel => channel.id === activeChannel
    );

    const title = $(".hub-channel-title");
    const description = $(".hub-channel-description");

    if (title) {
      title.textContent = `# ${active.name.toLowerCase()}`;
    }

    if (description) {
      description.textContent = active.description;
    }
  }

  /* ==========================================
     12. LOAD PLAYER PROFILE
     ========================================== */

  async function loadCurrentProfile() {
    if (!currentUser || !supabaseClient) return;

    try {
      const { data, error } = await supabaseClient
        .from("community_profiles")
        .select("id, username, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error) throw error;

      currentProfile = data;

      renderCommunityMembers();

    } catch (error) {
      console.error("Profile loading error:", error);
    }
  }

  /* ==========================================
     13. LOAD COMMUNITY MEMBERS
     ========================================== */

  async function loadCommunityProfiles() {
    if (!supabaseClient) return;

    try {
      const { data, error } = await supabaseClient
        .from("community_profiles")
        .select("id, username, avatar_url")
        .order("username", { ascending: true });

      if (error) throw error;

      communityProfiles = data || [];

      renderCommunityMembers();

    } catch (error) {
      console.error("Community member loading error:", error);
    }
  }

  /* ==========================================
     14. COMMUNITY MEMBER DISPLAY
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
      const member = document.createElement("div");
      member.className = "hub-member";

      const avatar = document.createElement("span");
      avatar.className = "hub-member-avatar";

      if (profile.avatar_url) {
        const image = document.createElement("img");

        image.src = profile.avatar_url;
        image.alt = "";
        image.loading = "lazy";

        image.onerror = () => {
          image.remove();
          avatar.textContent = getInitial(profile.username);
        };

        avatar.appendChild(image);
      } else {
        avatar.textContent = getInitial(profile.username);
      }

      const name = document.createElement("span");
      name.className = "hub-member-name";
      name.textContent = profile.username;

      const dot = document.createElement("span");
      dot.className = "hub-online-dot";

      const isOnline = onlineMembers.has(profile.id);

      dot.classList.toggle("is-online", isOnline);
      dot.title = isOnline ? "Online" : "Offline";

      member.append(avatar, name, dot);
      container.appendChild(member);
    });
  }

  /* ==========================================
     15. REAL-TIME MEMBER PRESENCE
     ========================================== */

  function stopPresence() {
    if (!presenceSubscription || !supabaseClient) return;

    supabaseClient.removeChannel(presenceSubscription);

    presenceSubscription = null;
    onlineMembers.clear();
  }

  async function startPresence() {
    if (!currentUser || !supabaseClient || !$("#community")) return;

    stopPresence();

    presenceSubscription = supabaseClient.channel(
      "nocturne-void-presence",
      {
        config: {
          presence: {
            key: currentUser.id
          }
        }
      }
    );

    presenceSubscription
      .on("presence", { event: "sync" }, () => {
        const state = presenceSubscription.presenceState();

        onlineMembers = new Set(Object.keys(state));

        renderCommunityMembers();
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await presenceSubscription.track({
            user_id: currentUser.id,
            username:
              currentProfile?.username ||
              currentUser.user_metadata?.username ||
              "Player"
          });
        }
      });
  }

  /* ==========================================
     16. LOAD SHARED MESSAGES
     ========================================== */

  async function loadCommunityMessages() {
    if (!supabaseClient) return;

    const container = $(".hub-messages");
    if (!container) return;

    container.textContent = "Loading messages...";

    try {
      const { data, error } = await supabaseClient
        .from("community_messages")
        .select("id, user_id, username, message, channel, created_at")
        .eq("channel", activeChannel)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      communityMessages = data || [];

      renderCommunityMessages();

      subscribeToCommunityMessages();

    } catch (error) {
      console.error("Message loading error:", error);

      container.textContent =
        "Unable to load messages. Please refresh the page.";
    }
  }

  /* ==========================================
     17. REAL-TIME MESSAGE SUBSCRIPTION
     ========================================== */

  function stopCommunitySubscriptions() {
    if (communitySubscription && supabaseClient) {
      supabaseClient.removeChannel(communitySubscription);
    }

    communitySubscription = null;
  }

  function subscribeToCommunityMessages() {
    if (!supabaseClient || !currentUser) return;

    stopCommunitySubscriptions();

    communitySubscription = supabaseClient
      .channel("nocturne-community-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_messages",
          filter: `channel=eq.${activeChannel}`
        },
        payload => {
          if (payload.eventType === "INSERT") {
            const incoming = payload.new;

            if (!communityMessages.some(
              message => message.id === incoming.id
            )) {
              communityMessages.push(incoming);

              communityMessages =
                communityMessages.slice(-100);

              renderCommunityMessages();
            }
          }

          if (payload.eventType === "DELETE") {
            communityMessages = communityMessages.filter(
              message => message.id !== payload.old.id
            );

            renderCommunityMessages();
          }
        }
      )
      .subscribe(status => {
        if (status === "CHANNEL_ERROR") {
          console.error("Community realtime subscription failed.");
        }
      });
  }

  /* ==========================================
     18. DISPLAY COMMUNITY MESSAGES
     ========================================== */

  function renderCommunityMessages() {
    const container = $(".hub-messages");
    if (!container) return;

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

      const avatar = document.createElement("div");
      avatar.className = "hub-avatar";

      const profile = communityProfiles.find(
        item => item.id === message.user_id
      );

      if (profile?.avatar_url) {
        const image = document.createElement("img");

        image.src = profile.avatar_url;
        image.alt = "";
        image.loading = "lazy";

        image.onerror = () => {
          image.remove();
          avatar.textContent = getInitial(message.username);
        };

        avatar.appendChild(image);
      } else {
        avatar.textContent = getInitial(message.username);
      }

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
     19. SEND SHARED COMMUNITY MESSAGE
     ========================================== */

  async function handleCommunityMessage(event) {
    event.preventDefault();

    const input = $(".hub-message-input");
    const submit = $(".hub-composer button");

    if (!input || !supabaseClient) return;

    if (!currentUser) {
      openAccountDialog();
      setAuthMode("login");

      showStatus("Please sign in before sending a message.");
      return;
    }

    const messageText = input.value.trim();

    if (!messageText) return;

    if (messageText.length > 1000) {
      showStatus("Messages cannot exceed 1000 characters.", true);
      return;
    }

    const username =
      currentProfile?.username ||
      currentUser.user_metadata?.username ||
      currentUser.email?.split("@")[0] ||
      "Player";

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
     20. MOBILE NAVIGATION
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
     21. FOOTER
     ========================================== */

  function initializeFooter() {
    const year = new Date().getFullYear();

    setText("year", year);
    setText("footerYear", year);
  }

  /* ==========================================
     22. START WEBSITE
     ========================================== */

  function initializeWebsite() {
    initializeGameLibrary();
    renderLeaderboard();

    initializeAccountButtons();
    initializeCommunity();

    initializeMobileNavigation();
    initializeFooter();

    connectSupabase();

    console.log("NOCTURNE VOID initialized successfully.");
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
