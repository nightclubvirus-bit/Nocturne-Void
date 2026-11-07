
// NOCTURNE VOID — Supabase account integration
// Replace the publishable-key placeholder below with your Supabase project's
// sb_publishable_... key. Never put a secret/service-role key in this file.
const SUPABASE_URL = "https://huzjjefknbicqxbhcryk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE";

const games = [
 {title:"Eclipsed",genre:"Horror",players:"1 player",description:"A forgotten estate. A presence that remembers you.",image:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80"},
 {title:"Ashen Crown",genre:"Adventure",players:"1–4 players",description:"A fallen kingdom waits beneath an endless winter.",image:"https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80"},
 {title:"Blood Oath",genre:"Action",players:"Multiplayer",description:"Make your pact. Enter the arena. Leave a legend.",image:"https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?auto=format&fit=crop&w=900&q=80"},
 {title:"The Hollow",genre:"Horror",players:"1 player",description:"The deeper you descend, the less you remember.",image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80"},
 {title:"Nightfall",genre:"Action",players:"Online co-op",description:"Survive the city after the last light disappears.",image:"https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80"},
 {title:"Thorn & Ember",genre:"Adventure",players:"1–2 players",description:"An ancient forest hides a dangerous kind of magic.",image:"https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80"}
];

const rankings = [["01","Vesper","VOID WALKER","12,840"],["02","Morrow","NIGHTBOUND","11,260"],["03","Ravenna","ASHEN SOUL","10,975"],["04","Noctis","DUSK SEEKER","9,410"],["05","Wraith","HOLLOW ONE","8,860"]];
let activeFilter = "All";
const grid = document.getElementById("gameGrid");

function renderGames() {
  const term = document.getElementById("gameSearch").value.toLowerCase();
  const shown = games.filter(g => (activeFilter === "All" || g.genre === activeFilter) && (g.title + " " + g.genre + " " + g.description).toLowerCase().includes(term));
  grid.innerHTML = shown.length ? shown.map(g => `<article class="game-card"><div class="game-art" style="background-image:url('${g.image}')"><span class="game-tag">${g.genre}</span></div><div class="game-info"><h3>${g.title}</h3><p>${g.description}</p><div class="game-meta"><span>${g.players}</span><span>Discover ↗</span></div></div></article>`).join("") : '<p class="empty-state">No games found in this corner of the void.</p>';
}
renderGames();
document.getElementById("gameSearch").addEventListener("input", renderGames);
document.getElementById("filters").addEventListener("click", e => {
  const button = e.target.closest("button[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach(x => x.classList.toggle("active", x === button));
  renderGames();
});
document.getElementById("leaderRows").innerHTML = rankings.map(r => `<div class="leader-row"><span class="rank">${r[0]}</span><span class="player">${r[1]}<small>${r[2]}</small></span><span class="score">${r[3]} XP</span></div>`).join("");

// Supabase client setup
const supabaseReady = window.supabase &&
  SUPABASE_PUBLISHABLE_KEY !== "PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE" &&
  SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_");

const supabaseClient = supabaseReady
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

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

function showStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("status-error", isError);
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";
  accountTitle.innerHTML = isSignup ? 'ENTER THE <em>VOID.</em>' : 'RETURN TO THE <em>VOID.</em>';
  accountDescription.textContent = isSignup
    ? "Create your player account and claim your identity."
    : "Sign in with the email and password linked to your account.";
  usernameLabel.hidden = !isSignup;
  playerNameInput.required = isSignup;
  playerNameInput.disabled = !isSignup;
  accountSubmit.textContent = isSignup ? "Create account" : "Sign in";
  authTabs.querySelectorAll(".auth-tab").forEach(button => button.classList.toggle("active", button.dataset.mode === mode));
  showStatus("");
}

authTabs.addEventListener("click", event => {
  const button = event.target.closest("[data-mode]");
  if (button) setAuthMode(button.dataset.mode);
});

function getDisplayName(user) {
  return user?.user_metadata?.username || user?.email?.split("@")[0] || "Wanderer";
}

function updateAccountUI(user) {
  currentUser = user || null;
  if (currentUser) {
    accountButton.textContent = getDisplayName(currentUser);
    authTabs.hidden = true;
    accountForm.hidden = true;
    logoutButton.hidden = false;
    accountTitle.innerHTML = 'WELCOME TO THE <em>VOID.</em>';
    accountDescription.textContent = `You are signed in as ${currentUser.email}.`;
    usernameLabel.hidden = true;
    showStatus(`Your account is active, ${getDisplayName(currentUser)}.`);
  } else {
    accountButton.textContent = "Sign in";
    authTabs.hidden = false;
    accountForm.hidden = false;
    logoutButton.hidden = true;
    setAuthMode("signup");
  }
}

function openAccountDialog() {
  if (!supabaseClient) {
    dialog.showModal();
    showStatus("Add your Supabase publishable key in script.js to activate accounts.", true);
    return;
  }
  if (currentUser) updateAccountUI(currentUser);
  else setAuthMode("signup");
  dialog.showModal();
}

accountButton.addEventListener("click", openAccountDialog);
document.getElementById("joinButton").addEventListener("click", openAccountDialog);

accountForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!supabaseClient) {
    showStatus("Supabase is not configured yet. Add your sb_publishable_ key in script.js.", true);
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  accountSubmit.disabled = true;
  accountSubmit.textContent = authMode === "signup" ? "Creating account..." : "Signing in...";
  showStatus("");

  try {
    if (authMode === "signup") {
      const username = playerNameInput.value.trim();
      if (!username) throw new Error("Choose a player name first.");
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { username } }
      });
      if (error) throw error;

      if (data.session) {
        updateAccountUI(data.user);
        showStatus(`Welcome to the void, ${username}. Your account has been created.`);
      } else {
        showStatus("Account created! Check your email for a confirmation link, then return here to sign in.");
      }
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      updateAccountUI(data.user);
      showStatus(`Welcome back, ${getDisplayName(data.user)}.`);
    }
    passwordInput.value = "";
  } catch (error) {
    showStatus(error.message || "Something went wrong. Please try again.", true);
  } finally {
    accountSubmit.disabled = false;
    accountSubmit.textContent = authMode === "signup" ? "Create account" : "Sign in";
  }
});

logoutButton.addEventListener("click", async () => {
  if (!supabaseClient) return;
  logoutButton.disabled = true;
  const { error } = await supabaseClient.auth.signOut();
  logoutButton.disabled = false;
  if (error) {
    showStatus(error.message, true);
    return;
  }
  updateAccountUI(null);
  showStatus("You have signed out of the void.");
});

if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) showStatus(error.message, true);
    updateAccountUI(data?.session?.user || null);
  });
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateAccountUI(session?.user || null);
  });
} else {
  updateAccountUI(null);
}

// Local demo chat remains local for now; it is not a shared live chat.
const chatMessages = document.getElementById("chatMessages");
function addMessage(message) {
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
  const saved = JSON.parse(localStorage.getItem("nv-chat") || "[]");
  saved.forEach(addMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
loadChat();

document.getElementById("chatForm").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.getElementById("chatInput");
  const messageText = input.value.trim();
  if (!messageText) return;
  const message = {
    name: currentUser ? getDisplayName(currentUser) : (localStorage.getItem("nv-player-name") || "Wanderer"),
    text: messageText,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  };
  const saved = JSON.parse(localStorage.getItem("nv-chat") || "[]");
  saved.push(message);
  localStorage.setItem("nv-chat", JSON.stringify(saved.slice(-40)));
  addMessage(message);
  input.value = "";
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

document.getElementById("chatJump").addEventListener("click", () => document.getElementById("chatInput").focus());
document.getElementById("year").textContent = new Date().getFullYear();
document.getElementById("menuToggle").addEventListener("click", () => document.getElementById("mainNav").classList.toggle("open"));
document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => document.getElementById("mainNav").classList.remove("open")));
