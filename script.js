
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

const supabaseReady =
  Boolean(window.supabase) &&
  SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_");

const supabaseClient = supabaseReady
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    )
  : null;


/* ==========================================
   2. GAME LIBRARY
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

let activeFilter = "All";

const grid = document.getElementById("gameGrid");

function renderGames() {
  if (!grid) return;

  const term =
    document.getElementById("gameSearch").value.toLowerCase();

  const shown = games.filter(game =>
    (activeFilter === "All" || game.genre === activeFilter) &&
    (
      game.title + " " +
      game.genre + " " +
      game.description
    ).toLowerCase().includes(term)
  );

  grid.innerHTML = shown.length
    ? shown.map(game => `
        <article class="game-card">
          <div class="game-art"
            style="background-image:url('${game.image}')">
            <span class="game-tag">${game.genre}</span>
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

document.getElementById("gameSearch")
  ?.addEventListener("input", renderGames);

document.getElementById("filters")
  ?.addEventListener("click", event => {

    const button = event.target.closest("button[data-filter]");
    if (!button) return;

    activeFilter = button.dataset.filter;

    document.querySelectorAll(".filter").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderGames();
  });


/* ==========================================
   3. LEADERBOARD
   ========================================== */

const rankings = [
  ["01", "Vesper", "VOID WALKER", "12,840"],
  ["02", "Morrow", "NIGHTBOUND", "11,260"],
  ["03", "Ravenna", "ASHEN SOUL", "10,975"],
  ["04", "Noctis", "DUSK SEEKER", "9,410"],
  ["05", "Wraith", "HOLLOW ONE", "8,860"]
];

const leaderRows = document.getElementById("leaderRows");

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
   4. ACCOUNT ELEMENTS
   ========================================== */

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

let authMode = "signup";
let currentUser = null;


/* ==========================================
   5. ACCOUNT STATUS
   ========================================== */

function showStatus(message, isError = false) {
  if (!statusText) return;

  statusText.textContent = message;
  statusText.classList.toggle("status-error", isError);
}

function getDisplayName(user) {
  return (
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Wanderer"
  );
}


/* ==========================================
   6. PASSWORD RECOVERY ELEMENTS
   ========================================== */

const forgotPasswordButton = document.createElement("button");

forgotPasswordButton.type = "button";
forgotPasswordButton.id = "forgotPasswordButton";
forgotPasswordButton.textContent = "Forgot Password?";
forgotPasswordButton.className = "forgot-password";

accountForm.appendChild(forgotPasswordButton);

const resetPasswordForm = document.createElement("form");

resetPasswordForm.id = "resetPasswordForm";
resetPasswordForm.hidden = true;

resetPasswordForm.innerHTML = `
  <label for="newPassword">NEW PASSWORD</label>
  <input
    type="password"
    id="newPassword"
    minlength="8"
    required
    autocomplete="new-password"
    placeholder="Enter your new password"
  >
  <button class="button button-primary" type="submit">
    Update Password
  </button>
`;

dialog.appendChild(resetPasswordForm);


/* ==========================================
   7. SIGNUP AND LOGIN
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

authTabs.addEventListener("click", event => {
  const button = event.target.closest("[data-mode]");

  if (button) setAuthMode(button.dataset.mode);
});


/* ==========================================
   8. ACCOUNT DISPLAY
   ========================================== */

function updateAccountUI(user) {
  currentUser = user || null;

  if (currentUser) {
    accountButton.textContent = getDisplayName(currentUser);

    authTabs.hidden = true;
    accountForm.hidden = true;
    logoutButton.hidden = false;

    accountTitle.innerHTML = 'WELCOME TO THE <em>VOID.</em>';

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

    resetPasswordForm.hidden = true;

    setAuthMode("signup");
  }
}


/* ==========================================
   9. OPEN ACCOUNT WINDOW
   ========================================== */

function openAccountDialog() {
  if (!supabaseClient) {
    dialog.showModal();
    showStatus("Supabase is not configured correctly.", true);
    return;
  }

  resetPasswordForm.hidden = true;
  accountForm.hidden = false;

  if (currentUser) {
    updateAccountUI(currentUser);
  } else {
    authTabs.hidden = false;
    setAuthMode("signup");
  }

  dialog.showModal();
}

accountButton.addEventListener("click", openAccountDialog);

document.getElementById("joinButton")
  ?.addEventListener("click", openAccountDialog);


/* ==========================================
   10. SIGNUP AND LOGIN SUBMISSION
   ========================================== */

accountForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!supabaseClient) {
    showStatus("Supabase is not configured.", true);
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  accountSubmit.disabled = true;

  accountSubmit.textContent =
    authMode === "signup"
      ? "Creating account..."
      : "Signing in...";

  showStatus("");

  try {
    if (authMode === "signup") {
      const username = playerNameInput.value.trim();

      if (!username) {
        throw new Error("Choose a player name first.");
      }

      const { data, error } =
        await supabaseClient.auth.signUp({
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
        updateAccountUI(data.user);

        showStatus(
          `Welcome to the void, ${username}. Your account has been created.`
        );
      } else {
        showStatus(
          "Account created! Check your email for a confirmation link, then return here to sign in."
        );
      }

    } else {
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      updateAccountUI(data.user);

      showStatus(
        `Welcome back, ${getDisplayName(data.user)}.`
      );
    }

    passwordInput.value = "";

  } catch (error) {
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
   11. FORGOT PASSWORD
   ========================================== */

forgotPasswordButton.addEventListener("click", async () => {
  if (!supabaseClient) {
    showStatus("Supabase is not configured.", true);
    return;
  }

  const email = emailInput.value.trim();

  if (!email) {
    showStatus("Please enter your email address first.", true);
    emailInput.focus();
    return;
  }

  forgotPasswordButton.disabled = true;
  forgotPasswordButton.textContent = "Sending email...";

  try {
    const { error } =
      await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: WEBSITE_URL
        }
      );

    if (error) throw error;

    showStatus("Password reset email sent! Check your inbox.");

  } catch (error) {
    showStatus(error.message, true);

  } finally {
    forgotPasswordButton.disabled = false;
    forgotPasswordButton.textContent = "Forgot Password?";
  }
});


/* ==========================================
   12. PASSWORD RECOVERY SCREEN
   ========================================== */

function openPasswordRecovery() {
  accountForm.hidden = true;
  authTabs.hidden = true;
  logoutButton.hidden = true;

  resetPasswordForm.hidden = false;

  accountTitle.innerHTML = 'CREATE A NEW <em>PASSWORD.</em>';

  accountDescription.textContent =
    "Choose a new password to return to the void.";

  showStatus("Enter your new password below.");

  if (!dialog.open) {
    dialog.showModal();
  }
}

resetPasswordForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!supabaseClient) return;

  const newPassword =
    document.getElementById("newPassword").value;

  const button = resetPasswordForm.querySelector("button");

  button.disabled = true;
  button.textContent = "Updating password...";

  try {
    const { data, error } =
      await supabaseClient.auth.updateUser({
        password: newPassword
      });

    if (error) throw error;

    document.getElementById("newPassword").value = "";

    resetPasswordForm.hidden = true;

    updateAccountUI(data.user);

    showStatus("Your password has been successfully updated!");

  } catch (error) {
    showStatus(error.message, true);

  } finally {
    button.disabled = false;
    button.textContent = "Update Password";
  }
});


/* ==========================================
   13. LOGOUT
   ========================================== */

logoutButton.addEventListener("click", async () => {
  if (!supabaseClient) return;

  logoutButton.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) throw error;

    updateAccountUI(null);

    showStatus("You have signed out of the void.");

  } catch (error) {
    showStatus(error.message, true);

  } finally {
    logoutButton.disabled = false;
  }
});


/* ==========================================
   14. AUTHENTICATION LISTENER
   ========================================== */

if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) showStatus(error.message, true);

    updateAccountUI(data?.session?.user || null);
  });

  supabaseClient.auth.onAuthStateChange((event, session) => {
    updateAccountUI(session?.user || null);

    if (event === "PASSWORD_RECOVERY") {
      openPasswordRecovery();
    }
  });

} else {
  updateAccountUI(null);
}


/* ==========================================
   15. COMMUNITY HUB
   DISCORD-STYLE LAYOUT
   ========================================== */

const communitySection = document.getElementById("community");

const communityChannels = [
  {
    id: "general",
    name: "general",
    description: "The main gathering place.",
    category: "WELCOME TO THE VOID"
  },
  {
    id: "introductions",
    name: "introductions",
    description: "Introduce yourself to the community.",
    category: "WELCOME TO THE VOID"
  },
  {
    id: "gaming",
    name: "gaming",
    description: "Talk about games and discoveries.",
    category: "GAMING"
  },
  {
    id: "looking-for-group",
    name: "looking-for-group",
    description: "Find people to play with.",
    category: "GAMING"
  },
  {
    id: "media",
    name: "media",
    description: "Share screenshots and creations.",
    category: "COMMUNITY"
  }
];

let activeChannel = "general";

const communityStorageKey = "nv-community-channels";

function loadChannelMessages() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(communityStorageKey) || "{}"
    );

    return saved && typeof saved === "object" ? saved : {};

  } catch {
    return {};
  }
}

let channelMessages = loadChannelMessages();

function saveChannelMessages() {
  try {
    localStorage.setItem(
      communityStorageKey,
      JSON.stringify(channelMessages)
    );
  } catch (error) {
    console.error("Unable to save community messages:", error);
  }
}


/* ==========================================
   16. COMMUNITY HUB DESIGN
   ========================================== */

const hubStyles = document.createElement("style");

hubStyles.textContent = `
.community-section {
  width: 100%;
}

.community-hub {
  width: 100%;
  min-height: 570px;
  display: grid;
  grid-template-columns: 205px minmax(0, 1fr) 180px;
  background: #100b10;
  border: 1px solid #49232f;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 20px 65px #0007;
}

.hub-sidebar {
  background: #0b080d;
  border-right: 1px solid #39202b;
  padding: 22px 14px;
}

.hub-server-name {
  color: #e5cbd3;
  font-family: Cinzel, serif;
  font-size: 13px;
  letter-spacing: 1px;
  padding: 4px 8px 20px;
  border-bottom: 1px solid #39202b;
  margin-bottom: 18px;
}

.hub-category {
  color: #a17d89;
  font-size: 9px;
  letter-spacing: 1.6px;
  margin: 20px 8px 9px;
}

.hub-channel {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  background: transparent;
  color: #a99aa2;
  border: 0;
  border-radius: 4px;
  padding: 10px 9px;
  text-align: left;
  cursor: pointer;
  font-size: 11px;
  transition: .2s;
}

.hub-channel:hover,
.hub-channel.active {
  background: #381a27;
  color: #f0cbd5;
}

.hub-channel span {
  color: #c16b84;
  font-size: 16px;
}

.hub-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #120d12;
}

.hub-header {
  padding: 18px 22px;
  border-bottom: 1px solid #39202b;
}

.hub-header h3 {
  color: #e6cbd4;
  font-family: Cinzel, serif;
  font-size: 15px;
  margin: 0 0 5px;
}

.hub-header p {
  color: #95838c;
  font-size: 10px;
  margin: 0;
}

.hub-messages {
  flex: 1;
  min-height: 320px;
  max-height: 420px;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 17px;
}

.hub-welcome {
  text-align: center;
  color: #a88b96;
  font-size: 11px;
  padding: 22px 10px;
  line-height: 1.8;
}

.hub-message {
  display: flex;
  gap: 11px;
  align-items: flex-start;
}

.hub-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #3a1927;
  color: #e7a0b3;
  font-family: Cinzel, serif;
  font-size: 12px;
}

.hub-message-content {
  min-width: 0;
}

.hub-message-top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 5px;
}

.hub-message-name {
  color: #e4a0b2;
  font-size: 11px;
  font-weight: 700;
}

.hub-message-time {
  color: #786973;
  font-size: 9px;
}

.hub-message-text {
  color: #d4c6cc;
  font-size: 11px;
  line-height: 1.7;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.hub-composer {
  display: flex;
  gap: 10px;
  padding: 15px;
  border-top: 1px solid #39202b;
}

.hub-composer input {
  flex: 1;
  min-width: 0;
  background: #09070a;
  border: 1px solid #49232f;
  color: white;
  padding: 13px;
  outline: none;
  font-size: 11px;
}

.hub-composer input:focus {
  border-color: #a34c67;
}

.hub-composer button {
  background: #68283e;
  border: 1px solid #91435b;
  color: white;
  padding: 0 17px;
  cursor: pointer;
}

.hub-composer button:hover {
  background: #8b3854;
}

.hub-members {
  background: #0c090e;
  border-left: 1px solid #39202b;
  padding: 22px 13px;
}

.hub-members h4 {
  color: #a98c97;
  font-size: 9px;
  letter-spacing: 1.5px;
  margin: 0 0 18px;
}

.hub-member {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 14px 0;
  color: #cbbbc3;
  font-size: 10px;
  overflow-wrap: anywhere;
}

.hub-member-avatar {
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  background: #321724;
  border-radius: 50%;
  color: #e5a4b5;
  flex-shrink: 0;
}

.hub-online-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #79b98b;
  margin-left: auto;
  flex-shrink: 0;
}

.hub-empty {
  color: #887680;
  font-size: 11px;
  text-align: center;
  padding: 30px 10px;
}

@media(max-width: 760px) {
  .community-hub {
    grid-template-columns: 145px minmax(0, 1fr);
  }

  .hub-members {
    display: none;
  }

  .hub-sidebar {
    padding: 15px 8px;
  }

  .hub-channel {
    font-size: 10px;
    padding: 9px 5px;
  }
}

@media(max-width: 480px) {
  .community-hub {
    grid-template-columns: 105px minmax(0, 1fr);
  }

  .hub-server-name {
    font-size: 10px;
    padding-left: 3px;
  }

  .hub-category {
    font-size: 8px;
    margin-left: 3px;
  }

  .hub-channel {
    font-size: 9px;
    gap: 4px;
  }

  .hub-header {
    padding: 15px 12px;
  }

  .hub-messages {
    padding: 12px;
  }
}
`;

document.head.appendChild(hubStyles);


/* ==========================================
   17. BUILD COMMUNITY HUB
   ========================================== */

const oldChatCard = communitySection?.querySelector(".chat-card");

if (oldChatCard) {
  oldChatCard.remove();
}

const oldCommunityCopy =
  communitySection?.querySelector(".community-copy");

if (oldCommunityCopy) {
  oldCommunityCopy.remove();
}

const hub = document.createElement("div");

hub.className = "community-hub";

hub.innerHTML = `
  <aside class="hub-sidebar">
    <div class="hub-server-name">✦ NOCTURNE VOID</div>
    <div id="hubChannelNavigation"></div>
  </aside>

  <main class="hub-main">
    <header class="hub-header">
      <h3 id="hubChannelTitle"># general</h3>
      <p id="hubChannelDescription">The main gathering place.</p>
    </header>

    <div class="hub-messages" id="hubMessages">
      <div class="hub-welcome">
        ✦ WELCOME TO THE VOID ✦<br>
        This is the beginning of your journey.
      </div>
    </div>

    <form class="hub-composer" id="hubMessageForm">
      <input
        id="hubMessageInput"
        maxlength="500"
        placeholder="Message #general..."
        autocomplete="off"
        aria-label="Write a community message"
      >
      <button type="submit" aria-label="Send message">➤</button>
    </form>
  </main>

  <aside class="hub-members">
    <h4>MEMBERS</h4>
    <div id="hubMemberList"></div>
  </aside>
`;

communitySection.appendChild(hub);


/* ==========================================
   18. CHANNEL NAVIGATION
   ========================================== */

const channelNavigation =
  document.getElementById("hubChannelNavigation");

const channelTitle =
  document.getElementById("hubChannelTitle");

const channelDescription =
  document.getElementById("hubChannelDescription");

const hubMessages =
  document.getElementById("hubMessages");

const hubMessageInput =
  document.getElementById("hubMessageInput");

const hubMemberList =
  document.getElementById("hubMemberList");

const hubMessageForm =
  document.getElementById("hubMessageForm");

function renderChannelNavigation() {
  const categories = [
    ...new Set(communityChannels.map(channel => channel.category))
  ];

  channelNavigation.innerHTML = categories.map(category => {
    const channels = communityChannels.filter(
      channel => channel.category === category
    );

    return `
      <div class="hub-category">${category}</div>
      ${channels.map(channel => `
        <button
          type="button"
          class="hub-channel ${activeChannel === channel.id ? "active" : ""}"
          data-channel="${channel.id}"
        >
          <span>#</span>${channel.name}
        </button>
      `).join("")}
    `;
  }).join("");
}

channelNavigation.addEventListener("click", event => {
  const button = event.target.closest("[data-channel]");

  if (!button) return;

  switchChannel(button.dataset.channel);
});


/* ==========================================
   19. SWITCH CHANNELS
   ========================================== */

function switchChannel(channelId) {
  const channel = communityChannels.find(
    item => item.id === channelId
  );

  if (!channel) return;

  activeChannel = channelId;

  channelTitle.textContent = "# " + channel.name;
  channelDescription.textContent = channel.description;

  hubMessageInput.placeholder =
    `Message #${channel.name}...`;

  renderChannelNavigation();
  renderChannelMessages();
  hubMessageInput.focus();
}


/* ==========================================
   20. RENDER CHANNEL MESSAGES
   ========================================== */

function renderChannelMessages() {
  const messages = channelMessages[activeChannel] || [];

  hubMessages.innerHTML = "";

  if (messages.length === 0) {
    const welcome = document.createElement("div");

    welcome.className = "hub-welcome";

    welcome.textContent =
      `✦ Welcome to #${activeChannel} ✦ — Be respectful and enjoy your stay.`;

    hubMessages.appendChild(welcome);

  } else {
    messages.forEach(addHubMessage);
  }

  hubMessages.scrollTop = hubMessages.scrollHeight;
}

function addHubMessage(message) {
  const wrapper = document.createElement("div");
  wrapper.className = "hub-message";

  const avatar = document.createElement("div");
  avatar.className = "hub-avatar";
  avatar.textContent = message.name.charAt(0).toUpperCase();

  const content = document.createElement("div");
  content.className = "hub-message-content";

  const top = document.createElement("div");
  top.className = "hub-message-top";

  const name = document.createElement("span");
  name.className = "hub-message-name";
  name.textContent = message.name;

  const time = document.createElement("time");
  time.className = "hub-message-time";
  time.textContent = message.time;

  const body = document.createElement("div");
  body.className = "hub-message-text";
  body.textContent = message.text;

  top.append(name, time);
  content.append(top, body);
  wrapper.append(avatar, content);

  hubMessages.appendChild(wrapper);
}


/* ==========================================
   21. SEND COMMUNITY MESSAGES
   ========================================== */

hubMessageForm.addEventListener("submit", event => {
  event.preventDefault();

  const text = hubMessageInput.value.trim();

  if (!text) return;

  if (!currentUser) {
    showStatus("Sign in to send messages in the community.");

    if (!dialog.open) dialog.showModal();

    return;
  }

  const message = {
    name: getDisplayName(currentUser),
    text,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
  };

  if (!channelMessages[activeChannel]) {
    channelMessages[activeChannel] = [];
  }

  channelMessages[activeChannel].push(message);

  channelMessages[activeChannel] =
    channelMessages[activeChannel].slice(-100);

  saveChannelMessages();

  addHubMessage(message);

  hubMessageInput.value = "";

  hubMessages.scrollTop = hubMessages.scrollHeight;
});


/* ==========================================
   22. MEMBER SIDEBAR
   ========================================== */

function renderMembers() {
  hubMemberList.innerHTML = "";

  if (!currentUser) {
    const visitor = document.createElement("p");

    visitor.className = "hub-empty";
    visitor.textContent = "Sign in to join the community.";

    hubMemberList.appendChild(visitor);
    return;
  }

  const member = document.createElement("div");
  member.className = "hub-member";

  const avatar = document.createElement("span");
  avatar.className = "hub-member-avatar";
  avatar.textContent = getDisplayName(currentUser)
    .charAt(0).toUpperCase();

  const name = document.createElement("span");
  name.textContent = getDisplayName(currentUser);

  const dot = document.createElement("span");
  dot.className = "hub-online-dot";

  member.append(avatar, name, dot);

  hubMemberList.appendChild(member);
}


/* ==========================================
   23. COMMUNITY INITIALIZATION
   ========================================== */

renderChannelNavigation();
renderChannelMessages();
renderMembers();

const previousUpdateAccountUI = updateAccountUI;

function refreshCommunityMembers() {
  renderMembers();
}

const originalAuthUpdate = updateAccountUI;

updateAccountUI = function(user) {
  originalAuthUpdate(user);
  refreshCommunityMembers();
};


/* ==========================================
   24. COMMUNITY BUTTON
   ========================================== */

document.getElementById("chatJump")
  ?.addEventListener("click", () => {
    document.getElementById("community")
      ?.scrollIntoView({ behavior: "smooth" });

    hubMessageInput.focus();
  });


/* ==========================================
   25. FOOTER YEAR
   ========================================== */

const year = document.getElementById("year");

if (year) {
  year.textContent = new Date().getFullYear();
}


/* ==========================================
   26. MOBILE NAVIGATION
   ========================================== */

document.getElementById("menuToggle")
  ?.addEventListener("click", () => {
    document.getElementById("mainNav")
      ?.classList.toggle("open");
  });

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    document.getElementById("mainNav")
      ?.classList.remove("open");
  });
});


/* ==========================================
   END OF NOCTURNE VOID SCRIPT
   ========================================== */

})();
