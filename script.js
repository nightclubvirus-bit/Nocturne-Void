const games = [
 {title:"Eclipsed",genre:"Horror",players:"1 player",description:"A forgotten estate. A presence that remembers you.",image:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80"},
 {title:"Ashen Crown",genre:"Adventure",players:"1–4 players",description:"A fallen kingdom waits beneath an endless winter.",image:"https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80"},
 {title:"Blood Oath",genre:"Action",players:"Multiplayer",description:"Make your pact. Enter the arena. Leave a legend.",image:"https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?auto=format&fit=crop&w=900&q=80"},
 {title:"The Hollow",genre:"Horror",players:"1 player",description:"The deeper you descend, the less you remember.",image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80"},
 {title:"Nightfall",genre:"Action",players:"Online co-op",description:"Survive the city after the last light disappears.",image:"https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80"},
 {title:"Thorn & Ember",genre:"Adventure",players:"1–2 players",description:"An ancient forest hides a dangerous kind of magic.",image:"https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80"}
];
const rankings=[["01","Vesper","VOID WALKER","12,840"],["02","Morrow","NIGHTBOUND","11,260"],["03","Ravenna","ASHEN SOUL","10,975"],["04","Noctis","DUSK SEEKER","9,410"],["05","Wraith","HOLLOW ONE","8,860"]];
let activeFilter="All";
const grid=document.getElementById("gameGrid");
function renderGames(){
 const term=document.getElementById("gameSearch").value.toLowerCase();
 const shown=games.filter(g=>(activeFilter==="All"||g.genre===activeFilter)&&(g.title+" "+g.genre+" "+g.description).toLowerCase().includes(term));
 grid.innerHTML=shown.length?shown.map(g=>`<article class="game-card"><div class="game-art" style="background-image:url('${g.image}')"><span class="game-tag">${g.genre}</span></div><div class="game-info"><h3>${g.title}</h3><p>${g.description}</p><div class="game-meta"><span>${g.players}</span><span>Discover ↗</span></div></div></article>`).join(""):'<p class="empty-state">No games found in this corner of the void.</p>';
}
renderGames();
document.getElementById("gameSearch").addEventListener("input",renderGames);
document.getElementById("filters").addEventListener("click",e=>{const b=e.target.closest("button[data-filter]");if(!b)return;activeFilter=b.dataset.filter;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));renderGames()});
document.getElementById("leaderRows").innerHTML=rankings.map(r=>`<div class="leader-row"><span class="rank">${r[0]}</span><span class="player">${r[1]}<small>${r[2]}</small></span><span class="score">${r[3]} XP</span></div>`).join("");
const dialog=document.getElementById("accountDialog");
function openProfile(){dialog.showModal()}
document.getElementById("accountButton").addEventListener("click",openProfile);
document.getElementById("joinButton").addEventListener("click",openProfile);
const savedName=localStorage.getItem("nv-player-name");
function updateAccountButton(){document.getElementById("accountButton").textContent=savedName||localStorage.getItem("nv-player-name")||"Sign in"}
updateAccountButton();
document.getElementById("profileForm").addEventListener("submit",e=>{e.preventDefault();const name=document.getElementById("playerName").value.trim();if(!name)return;localStorage.setItem("nv-player-name",name);document.getElementById("profileStatus").textContent=`Welcome to the void, ${name}. Your local profile is saved.`;document.getElementById("accountButton").textContent=name;document.getElementById("playerName").value=""});
const chatMessages=document.getElementById("chatMessages");
function loadChat(){const saved=JSON.parse(localStorage.getItem("nv-chat")||"[]");saved.forEach(addMessage);chatMessages.scrollTop=chatMessages.scrollHeight}
function addMessage(m){const div=document.createElement("div");div.className="message";const name=document.createElement("b");name.textContent=m.name;const body=document.createElement("span");body.textContent=m.text;const time=document.createElement("time");time.textContent=m.time;div.append(name,body,time);chatMessages.appendChild(div)}
loadChat();
document.getElementById("chatForm").addEventListener("submit",e=>{e.preventDefault();const input=document.getElementById("chatInput");const text=input.value.trim();if(!text)return;const message={name:localStorage.getItem("nv-player-name")||"Wanderer",text,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};const saved=JSON.parse(localStorage.getItem("nv-chat")||"[]");saved.push(message);localStorage.setItem("nv-chat",JSON.stringify(saved.slice(-40)));addMessage(message);input.value="";chatMessages.scrollTop=chatMessages.scrollHeight});
document.getElementById("chatJump").addEventListener("click",()=>document.getElementById("chatInput").focus());
document.getElementById("year").textContent=new Date().getFullYear();
document.getElementById("menuToggle").addEventListener("click",()=>document.getElementById("mainNav").classList.toggle("open"));
document.querySelectorAll(".nav-link").forEach(a=>a.addEventListener("click",()=>document.getElementById("mainNav").classList.remove("open")));
