
/* ==========================================
   NOCTURNE VOID
   COMPLETE WEBSITE SCRIPT
   ========================================== */

(() => {
"use strict";

/* ==========================================
   1. SUPABASE CONNECTION
   ========================================== */

const SUPABASE_URL =
  "https://huzjjefknbicqxbhcryk.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_CxmbXvQwPwOSC0WDx5HJng_qytHjcqc";

const WEBSITE_URL =
  "https://nightclubvirus-bit.github.io/Nocturne-Void/";

let supabaseClient = null;
let currentUser = null;
let authMode = "signup";
let activeFilter = "All";

/* ==========================================
   2. START WEBSITE
   ========================================== */

function initializeWebsite() {

  /* Account elements */

  const dialog = document.getElementById("accountDialog");
  const accountButton = document.getElementById("accountButton");
  const accountForm = document.getElementById("accountForm");
  const accountTitle = document.getElementById("accountTitle");
  const accountDescription = document.getElementById("accountDescription");
  const accountSubmit = document.getElementById("accountSubmit");

  const usernameLabel = document.getElementById("usernameLabel");
  const playerNameInput = document.getElementById("playerName");
  const emailInput = document.getElementById("accountEmail");
  const passwordInput = document.getElementById("accountPassword");

  const statusText = document.getElementById("profileStatus");
  const logoutButton = document.getElementById("logoutButton");
  const authTabs = document.getElementById("authTabs");

  /* Check essential HTML elements */

  if (
    !dialog ||
    !accountButton ||
    !accountForm ||
    !accountTitle ||
    !accountDescription ||
    !accountSubmit ||
    !usernameLabel ||
    !playerNameInput ||
    !emailInput ||
    !passwordInput ||
    !statusText ||
    !logoutButton ||
    !authTabs
  ) {
    console.error(
      "NOCTURNE VOID: An account HTML element is missing."
    );
    return;
  }

  /* ==========================================
     3. CONNECT TO SUPABASE
     ========================================== */

  if (
    window.supabase &&
    SUPABASE_URL &&
    SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")
  ) {
    try {
      supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
      );
    } catch (error) {
      console.error("Supabase connection error:", error);
    }
  }

  /* ==========================================
     4. ACCOUNT STATUS
     ========================================== */

  function showStatus(message, isError = false) {

    statusText.textContent = message;

    statusText.classList.toggle(
      "status-error",
      isError
    );
  }

  /* ==========================================
     5. PLAYER DISPLAY NAME
     ========================================== */

  function getDisplayName(user) {

    return (
      user?.user_metadata?.username ||
      user?.email?.split("@")[0] ||
      "Wanderer"
    );
  }

  /* ==========================================
     6. ACCOUNT DISPLAY
     ========================================== */

  function updateAccountUI(user) {

    currentUser = user || null;

    if (currentUser) {

      accountButton.textContent =
        getDisplayName(currentUser);

      authTabs.hidden = true;
      accountForm.hidden = true;
      logoutButton.hidden = false;

      accountTitle.innerHTML =
        'WELCOME TO THE <em>VOID.</em>';

      accountDescription.textContent =
        `You are signed in as ${currentUser.email}.`;

      usernameLabel.hidden = true;

      showStatus(
        `Your account is active, ${getDisplayName(currentUser)}.`
      );

    } else {

      accountButton.textContent = "Sign in";

      authTabs.hidden = false;
      accountForm.hidden = false;
      logoutButton.hidden = true;

      setAuthMode("signup");
    }
  }

  /* ==========================================
     7. SIGN UP / SIGN IN MODES
     ========================================== */

  function setAuthMode(mode) {

    authMode = mode;

    const isSignup = mode === "signup";

    accountTitle.innerHTML = isSignup
      ? 'ENTER THE <em>VOID.</em>'
      : 'RETURN TO THE <em>VOID.</em>';

    accountDescription.textContent = isSignup
      ? "Create your player account and claim your identity."
      : "Sign in with the email and password linked to your account.";

    usernameLabel.hidden = !isSignup;

    playerNameInput.required = isSignup;
    playerNameInput.disabled = !isSignup;

    forgotPasswordButton.hidden = isSignup;

    accountSubmit.textContent = isSignup
      ? "Create account"
      : "Sign in";

    authTabs.querySelectorAll(".auth-tab").forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.mode === mode
      );

    });

    showStatus("");
  }

  /* ==========================================
     8. FORGOT PASSWORD BUTTON
     ========================================== */

  const forgotPasswordButton =
    document.createElement("button");

  forgotPasswordButton.type = "button";
  forgotPasswordButton.id = "forgotPasswordButton";
  forgotPasswordButton.textContent = "Forgot Password?";

  accountForm.appendChild(forgotPasswordButton);

  /* ==========================================
     9. NEW PASSWORD FORM
     ========================================== */

  const resetPasswordForm =
    document.createElement("form");

  resetPasswordForm.id = "resetPasswordForm";
  resetPasswordForm.hidden = true;

  resetPasswordForm.innerHTML = `
    <label for="newPassword">New Password</label>

    <input
      type="password"
      id="newPassword"
      placeholder="Enter your new password"
      minlength="6"
      autocomplete="new-password"
      required
    >

    <button type="submit">
      Update Password
    </button>
  `;

  dialog.appendChild(resetPasswordForm);

  /* ==========================================
     10. PASSWORD RECOVERY SCREEN
     ========================================== */

  function openPasswordRecovery() {

    accountForm.hidden = true;
    authTabs.hidden = true;
    logoutButton.hidden = true;

    resetPasswordForm.hidden = false;

    accountTitle.innerHTML =
      'CREATE A NEW <em>PASSWORD.</em>';

    accountDescription.textContent =
      "Choose a new password to return to the void.";

    showStatus(
      "Enter your new password below."
    );

    if (!dialog.open) {
      dialog.showModal();
    }
  }

  /* ==========================================
     11. OPEN ACCOUNT WINDOW
     ========================================== */

  function openAccountDialog() {

    if (!supabaseClient) {

      if (!dialog.open) {
        dialog.showModal();
      }

      showStatus(
        "Supabase could not connect. Check your internet connection and Supabase setup.",
        true
      );

      return;
    }

    resetPasswordForm.hidden = true;
    accountForm.hidden = false;

    if (currentUser) {

      updateAccountUI(currentUser);

    } else {

      authTabs.hidden = false;
      accountForm.hidden = false;

      setAuthMode("signup");
    }

    if (!dialog.open) {
      dialog.showModal();
    }
  }

  accountButton.addEventListener(
    "click",
    openAccountDialog
  );

  const joinButton = document.getElementById("joinButton");

  if (joinButton) {
    joinButton.addEventListener(
      "click",
      openAccountDialog
    );
  }

  /* ==========================================
     12. SIGN UP / SIGN IN TABS
     ========================================== */

  authTabs.addEventListener("click", event => {

    const button = event.target.closest("[data-mode]");

    if (!button) return;

    const mode = button.dataset.mode;

    if (mode !== "signup" && mode !== "signin") return;

    resetPasswordForm.hidden = true;
    accountForm.hidden = false;

    setAuthMode(mode);
  });

  /* ==========================================
     13. SIGN UP AND SIGN IN
     ========================================== */

  accountForm.addEventListener("submit", async event => {

    event.preventDefault();

    if (!supabaseClient) {

      showStatus(
        "Supabase is not connected.",
        true
      );

      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {

      showStatus(
        "Please enter your email and password.",
        true
      );

      return;
    }

    accountSubmit.disabled = true;

    accountSubmit.textContent =
      authMode === "signup"
        ? "Creating account..."
        : "Signing in...";

    showStatus("");

    try {

      /* CREATE ACCOUNT */

      if (authMode === "signup") {

        const username = playerNameInput.value.trim();

        if (!username) {
          throw new Error("Choose a player name first.");
        }

        if (password.length < 6) {
          throw new Error("Your password must be at least 6 characters.");
        }

        const { data, error } =
          await supabaseClient.auth.signUp({

            email: email,

            password: password,

            options: {
              emailRedirectTo: WEBSITE_URL,

              data: {
                username: username
              }
            }

          });

        if (error) throw error;

        if (data.session) {

          updateAccountUI(data.user);

          showStatus(
            `Welcome to the void, ${username}. Your account has been created.`
          );

        } else {

          showStatus(
            "Account created! Check your email for the confirmation link. Once confirmed, return here and sign in."
          );
        }

      }

      /* SIGN IN */

      else {

        const { data, error } =
          await supabaseClient.auth.signInWithPassword({

            email: email,

            password: password

          });

        if (error) throw error;

        updateAccountUI(data.user);

        showStatus(
          `Welcome back, ${getDisplayName(data.user)}.`
        );
      }

      passwordInput.value = "";

    } catch (error) {

      console.error("Authentication error:", error);

      showStatus(
        error.message || "Something went wrong. Please try again.",
        true
      );

    } finally {

      accountSubmit.disabled = false;

      accountSubmit.textContent =
        authMode === "signup"
          ? "Create account"
          : "Sign in";
    }
  });

  /* ==========================================
     14. FORGOT PASSWORD
     ========================================== */

  forgotPasswordButton.addEventListener(
    "click",
    async () => {

      if (!supabaseClient) {

        showStatus(
          "Supabase is not connected.",
          true
        );

        return;
      }

      const email = emailInput.value.trim();

      if (!email) {

        showStatus(
          "Please enter your email address first.",
          true
        );

        emailInput.focus();

        return;
      }

      forgotPasswordButton.disabled = true;

      forgotPasswordButton.textContent =
        "Sending email...";

      showStatus("");

      try {

        const { error } =
          await supabaseClient.auth.resetPasswordForEmail(
            email,
            {
              redirectTo: WEBSITE_URL
            }
          );

        if (error) throw error;

        showStatus(
          "Password reset email sent! Check your inbox."
        );

      } catch (error) {

        console.error("Password reset error:", error);

        showStatus(
          error.message || "Unable to send password reset email.",
          true
        );

      } finally {

        forgotPasswordButton.disabled = false;

        forgotPasswordButton.textContent =
          "Forgot Password?";
      }
    }
  );

  /* ==========================================
     15. UPDATE PASSWORD
     ========================================== */

  resetPasswordForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      if (!supabaseClient) {

        showStatus(
          "Supabase is not connected.",
          true
        );

        return;
      }

      const newPassword =
        document.getElementById("newPassword").value;

      if (newPassword.length < 6) {

        showStatus(
          "Your new password must be at least 6 characters.",
          true
        );

        return;
      }

      const updateButton =
        resetPasswordForm.querySelector("button");

      updateButton.disabled = true;
      updateButton.textContent = "Updating password...";

      try {

        const { data, error } =
          await supabaseClient.auth.updateUser({

            password: newPassword

          });

        if (error) throw error;

        document.getElementById("newPassword").value = "";

        resetPasswordForm.hidden = true;

        updateAccountUI(data.user);

        showStatus(
          "Your password has been successfully updated!"
        );

      } catch (error) {

        console.error("Password update error:", error);

        showStatus(
          error.message || "Unable to update your password.",
          true
        );

      } finally {

        updateButton.disabled = false;
        updateButton.textContent = "Update Password";
      }
    }
  );

  /* ==========================================
     16. LOG OUT
     ========================================== */

  logoutButton.addEventListener(
    "click",
    async () => {

      if (!supabaseClient) return;

      logoutButton.disabled = true;

      try {

        const { error } =
          await supabaseClient.auth.signOut();

        if (error) throw error;

        updateAccountUI(null);

        showStatus(
          "You have signed out of the void."
        );

      } catch (error) {

        showStatus(
          error.message || "Unable to sign out.",
          true
        );

      } finally {

        logoutButton.disabled = false;
      }
    }
  );

  /* ==========================================
     17. SUPABASE AUTHENTICATION LISTENER
     ========================================== */

  if (supabaseClient) {

    supabaseClient.auth.onAuthStateChange(
      (event, session) => {

        updateAccountUI(
          session?.user || null
        );

        if (event === "PASSWORD_RECOVERY") {
          openPasswordRecovery();
        }

      }
    );

    supabaseClient.auth.getSession().then(
      ({ data, error }) => {

        if (error) {
          showStatus(error.message, true);
          return;
        }

        updateAccountUI(
          data?.session?.user || null
        );

      }
    ).catch(error => {

      console.error("Session error:", error);

      showStatus(
        "Unable to check your account session.",
        true
      );

    });

  } else {

    updateAccountUI(null);
  }

  /* ==========================================
     18. CHECK PASSWORD RECOVERY REDIRECT
     ========================================== */

  if (window.location.hash.includes("error=")) {

    const params = new URLSearchParams(
      window.location.hash.substring(1)
    );

    const errorDescription =
      params.get("error_description");

    if (errorDescription) {

      showStatus(
        errorDescription.replace(/\+/g, " "),
        true
      );
    }
  }

  /* ==========================================
     19. GAME LIBRARY
     ========================================== */

  const games = [

    {
      title: "Eclipsed",
      genre: "Horror",
      players: "1 player",
      description: "A forgotten estate. A presence that remembers you.",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80"
    },

    {
      title: "Ashen Crown",
      genre: "Adventure",
      players: "1–4 players",
      description: "A fallen kingdom waits beneath an endless winter.",
      image: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80"
    },

    {
      title: "Blood Oath",
      genre: "Action",
      players: "Multiplayer",
      description: "Make your pact. Enter the arena. Leave a legend.",
      image: "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?auto=format&fit=crop&w=900&q=80"
    },

    {
      title: "The Hollow",
      genre: "Horror",
      players: "1 player",
      description: "The deeper you descend, the less you remember.",
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80"
    },

    {
      title: "Nightfall",
      genre: "Action",
      players: "Online co-op",
      description: "Survive the city after the last light disappears.",
      image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80"
    },

    {
      title: "Thorn & Ember",
      genre: "Adventure",
      players: "1–2 players",
      description: "An ancient forest hides a dangerous kind of magic.",
      image: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80"
    }

  ];

  const grid = document.getElementById("gameGrid");
  const searchInput = document.getElementById("gameSearch");
  const filters = document.getElementById("filters");

  function renderGames() {

    if (!grid) return;

    const term = searchInput
      ? searchInput.value.toLowerCase()
      : "";

    const shown = games.filter(game => {

      return (
        (activeFilter === "All" ||
          game.genre === activeFilter) &&

        (
          game.title + " " +
          game.genre + " " +
          game.description
        ).toLowerCase().includes(term)
      );

    });

    grid.innerHTML = shown.length

      ? shown.map(game => `

          <article class="game-card">

            <div class="game-art"
              style="background-image:url('${game.image}')">

              <span class="game-tag">
                ${game.genre}
              </span>

            </div>

            <div class="game-info">

              <h3>${game.title}</h3>

              <p>${game.description}</p>

              <div class="game-meta">
                <span>${game.players}</span>
                <span>Discover ↗</span>
              </div>

            </div>

          </article>

        `).join("")

      : '<p class="empty-state">No games found in this corner of the void.</p>';
  }

  renderGames();

  if (searchInput) {

    searchInput.addEventListener(
      "input",
      renderGames
    );
  }

  if (filters) {

    filters.addEventListener("click", event => {

      const button =
        event.target.closest("button[data-filter]");

      if (!button) return;

      activeFilter = button.dataset.filter;

      document.querySelectorAll(".filter").forEach(item => {

        item.classList.toggle(
          "active",
          item === button
        );

      });

      renderGames();
    });
  }

  /* ==========================================
     20. PLAYER LEADERBOARD
     ========================================== */

  const rankings = [

    ["01", "Vesper", "VOID WALKER", "12,840"],
    ["02", "Morrow", "NIGHTBOUND", "11,260"],
    ["03", "Ravenna", "ASHEN SOUL", "10,975"],
    ["04", "Noctis", "DUSK SEEKER", "9,410"],
    ["05", "Wraith", "HOLLOW ONE", "8,860"]

  ];

  const leaderRows =
    document.getElementById("leaderRows");

  if (leaderRows) {

    leaderRows.innerHTML = rankings.map(rank => `

      <div class="leader-row">

        <span class="rank">${rank[0]}</span>

        <span class="player">
          ${rank[1]}
          <small>${rank[2]}</small>
        </span>

        <span class="score">${rank[3]} XP</span>

      </div>

    `).join("");
  }

  /* ==========================================
     21. COMMUNITY CHAT
     LOCAL DEMO CHAT
     ========================================== */

  const chatMessages =
    document.getElementById("chatMessages");

  const chatForm =
    document.getElementById("chatForm");

  const chatInput =
    document.getElementById("chatInput");

  function addMessage(message) {

    if (!chatMessages) return;

    const div = document.createElement("div");

    div.className = "message";

    const name = document.createElement("b");
    name.textContent = message.name;

    const body = document.createElement("span");
    body.textContent = message.text;

    const time = document.createElement("time");
    time.textContent = message.time;

    div.append(name, body, time);

    chatMessages.appendChild(div);
  }

  function loadChat() {

    if (!chatMessages) return;

    try {

      const saved = JSON.parse(
        localStorage.getItem("nv-chat") || "[]"
      );

      saved.forEach(addMessage);

      chatMessages.scrollTop =
        chatMessages.scrollHeight;

    } catch (error) {

      console.error("Chat loading error:", error);
    }
  }

  loadChat();

  if (chatForm && chatInput) {

    chatForm.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        const messageText =
          chatInput.value.trim();

        if (!messageText) return;

        const message = {

          name: currentUser
            ? getDisplayName(currentUser)
            : (
                localStorage.getItem("nv-player-name") ||
                "Wanderer"
              ),

          text: messageText,

          time: new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          )
        };

        try {

          const saved = JSON.parse(
            localStorage.getItem("nv-chat") || "[]"
          );

          saved.push(message);

          localStorage.setItem(
            "nv-chat",
            JSON.stringify(saved.slice(-40))
          );

          addMessage(message);

          chatInput.value = "";

          chatMessages.scrollTop =
            chatMessages.scrollHeight;

        } catch (error) {

          showStatus(
            "Unable to save your chat message.",
            true
          );
        }
      }
    );
  }

  /* ==========================================
     22. CHAT NAVIGATION
     ========================================== */

  const chatJump =
    document.getElementById("chatJump");

  if (chatJump && chatInput) {

    chatJump.addEventListener(
      "click",
      () => {
        chatInput.focus();
      }
    );
  }

  /* ==========================================
     23. FOOTER YEAR
     ========================================== */

  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  /* ==========================================
     24. MOBILE NAVIGATION
     ========================================== */

  const menuToggle =
    document.getElementById("menuToggle");

  const mainNav =
    document.getElementById("mainNav");

  if (menuToggle && mainNav) {

    menuToggle.addEventListener(
      "click",
      () => {
        mainNav.classList.toggle("open");
      }
    );

    document.querySelectorAll(".nav-link").forEach(link => {

      link.addEventListener(
        "click",
        () => {
          mainNav.classList.remove("open");
        }
      );
    });
  }

  /* ==========================================
     END OF WEBSITE INITIALIZATION
     ========================================== */

  console.log("NOCTURNE VOID successfully initialized.");

}

/* ==========================================
   25. WAIT FOR HTML TO LOAD
   ========================================== */

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    initializeWebsite,
    { once: true }
  );

} else {

  initializeWebsite();

}

})();

