let players = [];
let currentPlayer = 0;
let currentCard = 0;

const items = [
  { id: 1, title: "Inception" },
  { id: 2, title: "Interstellar" },
  { id: 3, title: "Joker" },
  { id: 4, title: "Avengers" },
  { id: 5, title: "Titanic" }
];

let votes = {};

// Add player inputs
function addPlayer() {
  const div = document.getElementById("players");
  const input = document.createElement("input");
  input.placeholder = "Player name";
  div.appendChild(input);
}

// Start game
function startGame() {
  const inputs = document.querySelectorAll("#players input");
  players = Array.from(inputs).map(i => i.value);

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("votingScreen").classList.remove("hidden");

  showCard();
}

// Show card
function showCard() {
  if (currentCard >= items.length) {
    nextPlayer();
    return;
  }

  const item = items[currentCard];
  document.getElementById("playerTurn").innerText =
    players[currentPlayer] + "'s Turn";

  const card = document.getElementById("card");
  card.innerHTML = `<h2>${item.title}</h2>
    <p>← NO | → YES | ↑ LOVE</p>`;
}

// Voting
document.addEventListener("keydown", (e) => {
  let value = 0;

  if (e.key === "ArrowRight") value = 1;
  if (e.key === "ArrowUp") value = 3;
  if (e.key === "ArrowLeft") value = 0;

  const item = items[currentCard];

  if (!votes[item.id]) votes[item.id] = {};
  votes[item.id][currentPlayer] = value;

  currentCard++;
  showCard();
});

// Next player
function nextPlayer() {
  currentPlayer++;
  currentCard = 0;

  if (currentPlayer >= players.length) {
    showResults();
    return;
  }

  alert(players[currentPlayer] + "'s Turn");
  showCard();
}

// Results
function showResults() {
  document.getElementById("votingScreen").classList.add("hidden");
  document.getElementById("resultScreen").classList.remove("hidden");

  const scores = items.map(item => {
    let total = 0;
    if (votes[item.id]) {
      total = Object.values(votes[item.id]).reduce((a, b) => a + b, 0);
    }
    return { ...item, score: total };
  });

  scores.sort((a, b) => b.score - a.score);

  document.getElementById("winner").innerText =
    "Winner: " + scores[0].title;

  document.getElementById("ranking").innerHTML =
    scores.map((s, i) => `${i + 1}. ${s.title} - ${s.score}`).join("<br>");
}