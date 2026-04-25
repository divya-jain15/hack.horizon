// ---------------- STATE ----------------
const state = {
  players: [],
  currentPlayer: 0,
  currentCard: 0,
  votes: {},
};

// Mock Data
const items = [
  { id: 1, title: "Inception", genre: "Sci-Fi", img: "https://picsum.photos/300/200?1" },
  { id: 2, title: "Avengers", genre: "Action", img: "https://picsum.photos/300/200?2" },
  { id: 3, title: "Interstellar", genre: "Drama", img: "https://picsum.photos/300/200?3" },
  { id: 4, title: "Joker", genre: "Thriller", img: "https://picsum.photos/300/200?4" },
  { id: 5, title: "Titanic", genre: "Romance", img: "https://picsum.photos/300/200?5" },
];

// ---------------- INIT ----------------
const playersContainer = document.getElementById("playersContainer");

function addPlayerInput(value="") {
  const input = document.createElement("input");
  input.placeholder = "Player name";
  input.value = value;
  playersContainer.appendChild(input);
}

addPlayerInput();
addPlayerInput();

// ---------------- START ----------------
document.getElementById("addPlayerBtn").onclick = () => {
  if (playersContainer.children.length < 5) addPlayerInput();
};

document.getElementById("startBtn").onclick = () => {
  const inputs = playersContainer.querySelectorAll("input");
  state.players = [...inputs].map(i => i.value).filter(v => v);

  if (state.players.length < 2) return alert("Need at least 2 players");

  showScreen("votingScreen");
  startTurn();
};

// ---------------- SCREEN SWITCH ----------------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ---------------- TURN ----------------
function startTurn() {
  state.currentCard = 0;
  document.getElementById("playerTurn").innerText =
    `${state.players[state.currentPlayer]}'s Turn`;

  renderCards();
}

// ---------------- CARD RENDER ----------------
function renderCards() {
  const stack = document.getElementById("cardStack");
  stack.innerHTML = "";

  items.slice(state.currentCard).reverse().forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.transform = `scale(${1 - i * 0.05}) translateY(${i * 10}px)`;

    card.innerHTML = `
      <img src="${item.img}" />
      <div class="card-content">
        <h3>${item.title}</h3>
        <p>${item.genre}</p>
      </div>
      <div class="overlay like">👍</div>
      <div class="overlay nope">❌</div>
      <div class="overlay love">❤️</div>
    `;

    if (i === 0) enableSwipe(card, item);

    stack.appendChild(card);
  });
}

// ---------------- SWIPE LOGIC ----------------
function enableSwipe(card, item) {
  let startX = 0, startY = 0, dx = 0, dy = 0;
  let startTime = 0;

  const onStart = (e) => {
    startX = e.clientX || e.touches[0].clientX;
    startY = e.clientY || e.touches[0].clientY;
    startTime = Date.now();

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchmove", onMove);
    document.addEventListener("touchend", onEnd);
  };

  const onMove = (e) => {
    const x = e.clientX || e.touches[0].clientX;
    const y = e.clientY || e.touches[0].clientY;

    dx = x - startX;
    dy = y - startY;

    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx/10}deg)`;

    updateOverlay(card, dx, dy);
  };

  const onEnd = () => {
    const time = Date.now() - startTime;
    const velocity = Math.sqrt(dx*dx + dy*dy) / time;

    const threshold = 80;

    let vote = 0;

    if (dx > threshold) vote = 1;
    else if (dx < -threshold) vote = 0;
    else if (dy < -threshold) vote = 3;

    if (vote !== null && (Math.abs(dx) > threshold || Math.abs(dy) > threshold)) {
      saveVote(item.id, vote);
      flyOut(card, dx, dy);
    } else {
      resetCard(card);
    }

    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onEnd);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
  };

  card.addEventListener("mousedown", onStart);
  card.addEventListener("touchstart", onStart);
}

// ---------------- OVERLAY ----------------
function updateOverlay(card, dx, dy) {
  card.querySelector(".like").style.opacity = dx > 0 ? dx/100 : 0;
  card.querySelector(".nope").style.opacity = dx < 0 ? -dx/100 : 0;
  card.querySelector(".love").style.opacity = dy < 0 ? -dy/100 : 0;
}

// ---------------- ANIMATIONS ----------------
function flyOut(card, dx, dy) {
  card.style.transition = "0.5s";
  card.style.transform = `translate(${dx*5}px, ${dy*5}px) rotate(${dx/5}deg)`;

  setTimeout(() => {
    nextCard();
  }, 300);
}

function resetCard(card) {
  card.style.transition = "0.3s";
  card.style.transform = "translate(0,0) rotate(0)";
}

// ---------------- VOTE ----------------
function saveVote(id, score) {
  if (!state.votes[id]) state.votes[id] = {};
  state.votes[id][state.currentPlayer] = score;
}

// ---------------- NEXT ----------------
function nextCard() {
  state.currentCard++;

  if (state.currentCard >= items.length) {
    nextPlayer();
  } else {
    renderCards();
  }
}

// ---------------- PLAYER SWITCH ----------------
function nextPlayer() {
  state.currentPlayer++;

  if (state.currentPlayer >= state.players.length) {
    showResults();
  } else {
    showScreen("transitionScreen");
    document.getElementById("nextPlayerText").innerText =
      `Next: ${state.players[state.currentPlayer]}`;
  }
}

document.getElementById("startTurnBtn").onclick = () => {
  showScreen("votingScreen");
  startTurn();
};

// ---------------- RESULTS ----------------
function showResults() {
  showScreen("resultScreen");

  let count = 3;
  const el = document.getElementById("countdown");

  const interval = setInterval(() => {
    count--;
    el.innerText = count;

    if (count === 0) {
      clearInterval(interval);
      el.style.display = "none";
      displayResults();
    }
  }, 800);
}

function displayResults() {
  const scores = items.map(item => {
    let total = 0;
    if (state.votes[item.id]) {
      Object.values(state.votes[item.id]).forEach(v => total += v);
    }
    return { ...item, score: total };
  });

  scores.sort((a,b) => b.score - a.score);

  const winner = scores[0];
  const winnerDiv = document.getElementById("winnerCard");

  winnerDiv.innerHTML = `
    <h2>${winner.title}</h2>
    <p>Score: ${winner.score}</p>
  `;

  const list = document.getElementById("topList");
  list.innerHTML = scores.slice(0,3).map((s,i) =>
    `<p>#${i+1} ${s.title} (${s.score})</p>`
  ).join("");

  document.getElementById("resultsContent").classList.remove("hidden");
}