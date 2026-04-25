/* ============================================
   Quorum — Group Decision Swipe App
   Pure JavaScript Implementation
   ============================================ */

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    players: [],
    currentPlayerIndex: 0,
    currentCardIndex: 0,
    votes: {},
    items: []
};

// Mock data — movies/items to vote on
const MOCK_ITEMS = [
    {
        id: 1,
        title: "Dune: Part Two",
        genre: "Sci-Fi • Adventure",
        image: "[images.unsplash.com](https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&h=800&fit=crop)"
    },
    {
        id: 2,
        title: "The Grand Budapest Hotel",
        genre: "Comedy • Drama",
        image: "[images.unsplash.com](https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&h=800&fit=crop)"
    },
    {
        id: 3,
        title: "Interstellar",
        genre: "Sci-Fi • Drama",
        image: "[images.unsplash.com](https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600&h=800&fit=crop)"
    },
    {
        id: 4,
        title: "Parasite",
        genre: "Thriller • Drama",
        image: "[images.unsplash.com](https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&h=800&fit=crop)"
    },
    {
        id: 5,
        title: "Everything Everywhere All at Once",
        genre: "Action • Comedy",
        image: "[images.unsplash.com](https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&h=800&fit=crop)"
    }
];

// Vote score values
const VOTE_SCORES = {
    NO: 0,
    YES: 1,
    LOVE: 3
};

// Swipe thresholds
const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 0.5;
const ROTATION_FACTOR = 0.1;

// ============================================
// DOM REFERENCES
// ============================================
const screens = {
    start: document.getElementById('start-screen'),
    voting: document.getElementById('voting-screen'),
    transition: document.getElementById('transition-screen'),
    countdown: document.getElementById('countdown-screen'),
    results: document.getElementById('results-screen')
};

const elements = {
    playerInput: document.getElementById('player-input'),
    addPlayerBtn: document.getElementById('add-player-btn'),
    playersList: document.getElementById('players-list'),
    playerCount: document.getElementById('player-count'),
    startBtn: document.getElementById('start-btn'),
    currentPlayerName: document.getElementById('current-player-name'),
    progressIndicator: document.getElementById('progress-indicator'),
    cardStack: document.getElementById('card-stack'),
    nextPlayerName: document.getElementById('next-player-name'),
    startTurnBtn: document.getElementById('start-turn-btn'),
    countdownNumber: document.getElementById('countdown-number'),
    winnerCard: document.getElementById('winner-card'),
    topResults: document.getElementById('top-results'),
    restartBtn: document.getElementById('restart-btn'),
    confettiCanvas: document.getElementById('confetti-canvas'),
    feedbackNo: document.getElementById('feedback-no'),
    feedbackYes: document.getElementById('feedback-yes'),
    feedbackLove: document.getElementById('feedback-love')
};

// ============================================
// SCREEN MANAGEMENT
// ============================================
function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    screens[screenName].classList.add('active');
}

// ============================================
// PLAYER MANAGEMENT
// ============================================
function renderPlayers() {
    elements.playersList.innerHTML = state.players
        .map((name, index) => `
            <div class="player-chip" style="animation-delay: ${index * 0.05}s">
                <span>${name}</span>
                <button onclick="removePlayer(${index})" aria-label="Remove ${name}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `)
        .join('');
    
    elements.playerCount.textContent = `${state.players.length} / 5 players`;
    elements.addPlayerBtn.disabled = state.players.length >= 5;
    elements.startBtn.disabled = state.players.length < 2;
}

function addPlayer() {
    const name = elements.playerInput.value.trim();
    if (name && state.players.length < 5) {
        state.players.push(name);
        elements.playerInput.value = '';
        renderPlayers();
        elements.playerInput.focus();
    }
}

function removePlayer(index) {
    state.players.splice(index, 1);
    renderPlayers();
}

// ============================================
// CARD STACK RENDERING
// ============================================
function renderCardStack() {
    const remainingItems = state.items.slice(state.currentCardIndex);
    
    elements.cardStack.innerHTML = remainingItems
        .slice(0, 3)
        .reverse()
        .map((item, reverseIndex) => {
            const actualIndex = Math.min(2, remainingItems.length - 1) - reverseIndex;
            const scale = 1 - actualIndex * 0.05;
            const translateY = actualIndex * 8;
            const zIndex = 3 - actualIndex;
            const isTop = actualIndex === 0;
            
            return `
                <div class="swipe-card ${isTop ? '' : 'inactive'}" 
                     data-item-id="${item.id}"
                     style="transform: scale(${scale}) translateY(${translateY}px); z-index: ${zIndex};">
                    <img class="card-image" src="${item.image}" alt="${item.title}" draggable="false">
                    <div class="card-info">
                        <h3 class="card-title">${item.title}</h3>
                        <p class="card-genre">${item.genre}</p>
                    </div>
                    <div class="card-overlay overlay-yes">✓</div>
                    <div class="card-overlay overlay-no">✕</div>
                    <div class="card-overlay overlay-love">♥</div>
                </div>
            `;
        })
        .join('');
    
    // Attach swipe handlers to top card
    const topCard = elements.cardStack.querySelector('.swipe-card:not(.inactive)');
    if (topCard) {
        attachSwipeHandlers(topCard);
    }
}

function renderProgressIndicator() {
    const total = state.items.length;
    elements.progressIndicator.innerHTML = Array.from({ length: total }, (_, i) => {
        let className = 'progress-dot';
        if (i < state.currentCardIndex) className += ' completed';
        else if (i === state.currentCardIndex) className += ' current';
        return `<div class="${className}"></div>`;
    }).join('');
}

// ============================================
// SWIPE LOGIC — Touch & Mouse Support
// ============================================
function attachSwipeHandlers(card) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let startTime = 0;
    let isDragging = false;
    
    const overlayYes = card.querySelector('.overlay-yes');
    const overlayNo = card.querySelector('.overlay-no');
    const overlayLove = card.querySelector('.overlay-love');
    
    function getEventCoords(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }
    
    function handleStart(e) {
        if (card.classList.contains('animating')) return;
        
        const coords = getEventCoords(e);
        startX = coords.x;
        startY = coords.y;
        currentX = 0;
        currentY = 0;
        startTime = Date.now();
        isDragging = true;
        
        card.style.transition = 'none';
    }
    
    function handleMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        const coords = getEventCoords(e);
        currentX = coords.x - startX;
        currentY = coords.y - startY;
        
        // Apply transform with rotation
        const rotation = currentX * ROTATION_FACTOR;
        card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;
        
        // Update overlays based on direction
        const absX = Math.abs(currentX);
        const absY = Math.abs(currentY);
        
        overlayYes.style.opacity = currentX > 0 ? Math.min(currentX / SWIPE_THRESHOLD, 1) * 0.8 : 0;
        overlayNo.style.opacity = currentX < 0 ? Math.min(absX / SWIPE_THRESHOLD, 1) * 0.8 : 0;
        overlayLove.style.opacity = currentY < 0 && absY > absX ? Math.min(absY / SWIPE_THRESHOLD, 1) * 0.8 : 0;
    }
    
    function handleEnd() {
        if (!isDragging) return;
        isDragging = false;
        
        const duration = Date.now() - startTime;
        const velocityX = Math.abs(currentX) / duration;
        const velocityY = Math.abs(currentY) / duration;
        
        const absX = Math.abs(currentX);
        const absY = Math.abs(currentY);
        
        let swipeDirection = null;
        
        // Determine swipe direction based on threshold and velocity
        if (currentY < -SWIPE_THRESHOLD || (currentY < 0 && velocityY > SWIPE_VELOCITY_THRESHOLD && absY > absX)) {
            swipeDirection = 'up';
        } else if (currentX > SWIPE_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD && currentX > 0) {
            swipeDirection = 'right';
        } else if (currentX < -SWIPE_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD && currentX < 0) {
            swipeDirection = 'left';
        }
        
        if (swipeDirection) {
            completeSwipe(card, swipeDirection);
        } else {
            // Snap back
            card.classList.add('animating');
            card.style.transform = 'translate(0, 0) rotate(0deg)';
            overlayYes.style.opacity = 0;
            overlayNo.style.opacity = 0;
            overlayLove.style.opacity = 0;
            
            setTimeout(() => {
                card.classList.remove('animating');
            }, 400);
        }
    }
    
    // Touch events
    card.addEventListener('touchstart', handleStart, { passive: true });
    card.addEventListener('touchmove', handleMove, { passive: false });
    card.addEventListener('touchend', handleEnd);
    card.addEventListener('touchcancel', handleEnd);
    
    // Mouse events
    card.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
}

function completeSwipe(card, direction) {
    const itemId = parseInt(card.dataset.itemId);
    
    // Calculate exit position
    let exitX = 0;
    let exitY = 0;
    let rotation = 0;
    let voteType = 'NO';
    let feedbackElement = null;
    
    switch (direction) {
        case 'right':
            exitX = window.innerWidth;
            rotation = 30;
            voteType = 'YES';
            feedbackElement = elements.feedbackYes;
            break;
        case 'left':
            exitX = -window.innerWidth;
            rotation = -30;
            voteType = 'NO';
            feedbackElement = elements.feedbackNo;
            break;
        case 'up':
            exitY = -window.innerHeight;
            voteType = 'LOVE';
            feedbackElement = elements.feedbackLove;
            break;
    }
    
    // Show feedback
    feedbackElement.classList.add('show');
    setTimeout(() => feedbackElement.classList.remove('show'), 400);
    
    // Animate card exit
    card.classList.add('animating');
    card.style.transform = `translate(${exitX}px, ${exitY}px) rotate(${rotation}deg)`;
    card.style.opacity = '0';
    
    // Record vote
    recordVote(itemId, voteType);
    
    // Move to next card
    setTimeout(() => {
        state.currentCardIndex++;
        
        if (state.currentCardIndex >= state.items.length) {
            // Player finished all cards
            moveToNextPlayer();
        } else {
            renderCardStack();
            renderProgressIndicator();
        }
    }, 300);
}

// ============================================
// VOTE MANAGEMENT
// ============================================
function recordVote(itemId, voteType) {
    if (!state.votes[itemId]) {
        state.votes[itemId] = {};
    }
    state.votes[itemId][state.currentPlayerIndex] = VOTE_SCORES[voteType];
}

function calculateResults() {
    const results = state.items.map(item => {
        const votes = state.votes[item.id] || {};
        const totalScore = Object.values(votes).reduce((sum, score) => sum + score, 0);
        return { ...item, score: totalScore };
    });
    
    return results.sort((a, b) => b.score - a.score);
}

// ============================================
// GAME FLOW
// ============================================
function startSession() {
    state.items = [...MOCK_ITEMS];
    state.votes = {};
    state.currentPlayerIndex = 0;
    state.currentCardIndex = 0;
    
    startPlayerTurn();
}

function startPlayerTurn() {
    state.currentCardIndex = 0;
    elements.currentPlayerName.textContent = `${state.players[state.currentPlayerIndex]}'s Turn`;
    
    showScreen('voting');
    renderCardStack();
    renderProgressIndicator();
}

function moveToNextPlayer() {
    state.currentPlayerIndex++;
    
    if (state.currentPlayerIndex >= state.players.length) {
        // All players done, show countdown then results
        showCountdown();
    } else {
        // Show transition screen for next player
        elements.nextPlayerName.textContent = state.players[state.currentPlayerIndex];
        showScreen('transition');
    }
}

function showCountdown() {
    showScreen('countdown');
    
    let count = 3;
    elements.countdownNumber.textContent = count;
    
    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            elements.countdownNumber.textContent = count;
        } else {
            clearInterval(countdownInterval);
            showResults();
        }
    }, 1000);
}

function showResults() {
    const results = calculateResults();
    const winner = results[0];
    
    // Render winner card
    elements.winnerCard.innerHTML = `
        <img src="${winner.image}" alt="${winner.title}">
        <div class="card-info">
            <h3 class="card-title">${winner.title}</h3>
            <p class="card-genre">${winner.genre}</p>
            <div class="winner-score">
                <span>★</span>
                <span>${winner.score} points</span>
            </div>
        </div>
    `;
    
    // Render top 3 (or all if less than 3)
    const topItems = results.slice(0, Math.min(3, results.length));
    elements.topResults.innerHTML = topItems
        .map((item, index) => {
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze';
            return `
                <div class="result-item">
                    <div class="result-rank ${rankClass}">${index + 1}</div>
                    <div class="result-info">
                        <div class="result-title">${item.title}</div>
                        <div class="result-genre">${item.genre}</div>
                    </div>
                    <div class="result-score">${item.score} pts</div>
                </div>
            `;
        })
        .join('');
    
    showScreen('results');
    startConfetti();
}

function restartGame() {
    state.players = [];
    state.currentPlayerIndex = 0;
    state.currentCardIndex = 0;
    state.votes = {};
    
    renderPlayers();
    showScreen('start');
}

// ============================================
// CONFETTI ANIMATION
// ============================================
function startConfetti() {
    const canvas = elements.confettiCanvas;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#22c55e', '#f59e0b', '#ef4444'];
    
    // Create particles
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        });
    }
    
    let animationId;
    let frame = 0;
    const maxFrames = 300;
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
            
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;
            
            if (p.y > canvas.height) {
                p.y = -10;
                p.x = Math.random() * canvas.width;
            }
        });
        
        frame++;
        if (frame < maxFrames) {
            animationId = requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    animate();
}

// ============================================
// EVENT LISTENERS
// ============================================
function initEventListeners() {
    // Add player
    elements.addPlayerBtn.addEventListener('click', addPlayer);
    elements.playerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPlayer();
    });
    
    // Start session
    elements.startBtn.addEventListener('click', startSession);
    
    // Start turn (transition screen)
    elements.startTurnBtn.addEventListener('click', startPlayerTurn);
    
    // Restart game
    elements.restartBtn.addEventListener('click', restartGame);
    
    // Handle window resize for confetti
    window.addEventListener('resize', () => {
        elements.confettiCanvas.width = window.innerWidth;
        elements.confettiCanvas.height = window.innerHeight;
    });
}

// ============================================
// INITIALIZATION
// ============================================
function init() {
    renderPlayers();
    initEventListeners();
    showScreen('start');
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
