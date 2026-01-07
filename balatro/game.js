const suits = ["♠", "♥", "♦", "♣"];
const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];

const HAND_SIZE = 8;       // cartas visíveis
const PLAY_HAND_SIZE = 5; // cartas jogadas

let deck = [];
let hand = [];
let points = 0;

let playsLeft = 3;
let discardsLeft = 7;
let unlockedBlinds = 1; // começa liberando só a Small

let gameState = "BLIND_SELECT"; // BLIND_SELECT | PLAYING
let currentBlind = null;

const BLINDS = [
    { id: "small", name: "Small Blind", requirement: 300 },
    { id: "big", name: "Big Blind", requirement: 800 },
    { id: "boss", name: "Boss Blind", requirement: 2000 }
];


/* ---------- RODADA ---------- */
function newRound() {
    deck = [];
    for (let s of suits) {
        for (let v of values) {
            deck.push({ value: v, suit: s });
        }
    }

    shuffle(deck);

    playsLeft = 3;
    discardsLeft = 7;

    hand = [];
    drawUpToHandSize();
    updateUI();
}

function chipValue(card) {
    if (card.value === "A") return 11;
    if (card.value === "K" || card.value === "Q" || card.value === "J") return 10;
    return card.value;
}


const HAND_SCORES = {
    "High Card": { chips: 5, mult: 1 },
    "Par": { chips: 10, mult: 2 },
    "Dois Pares": { chips: 20, mult: 2 },
    "Trinca": { chips: 30, mult: 3 },
    "Sequência": { chips: 30, mult: 4 },
    "Flush": { chips: 35, mult: 4 },
    "Full House": { chips: 40, mult: 4 },
    "Quadra": { chips: 60, mult: 7 },
    "Straight Flush": { chips: 100, mult: 8 },
    "Royal Flush": { chips: 100, mult: 8 }
};


/* ---------- BARALHO ---------- */
function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function drawCard() {
    if (deck.length === 0) return null;
    return { ...deck.pop(), selected: false };
}

function drawUpToHandSize() {
    while (hand.length < HAND_SIZE && deck.length > 0) {
        hand.push(drawCard());
    }
    renderHand();
}

/* ---------- SELEÇÃO ---------- */
function toggleSelect(index) {
    const selectedCount = hand.filter(c => c.selected).length;

    if (!hand[index].selected && selectedCount >= PLAY_HAND_SIZE) return;

    hand[index].selected = !hand[index].selected;
    renderHand();
    updateUI();
}

/* ---------- DESCARTE ---------- */
function discardCards() {
    if (discardsLeft <= 0) return;

    const selected = hand.filter(c => c.selected);
    if (selected.length === 0) return;

    discardsLeft--;
    hand = hand.filter(c => !c.selected);

    drawUpToHandSize();
    updateUI();
}

/* ---------- JOGAR MÃO ---------- */
function playHand() {
    if (playsLeft <= 0) return;

    const playedCards = hand.filter(c => c.selected);
    if (playedCards.length === 0) return;

    const score = evaluateHand(playedCards);
    points += score;

    playsLeft--;

    document.getElementById("result").innerText =
        `Mão: ${identifyHand(playedCards)} (+${score})`;

    // 🔥 CHECK IMEDIATO DA BLIND
    if (checkBlindWin()) return;


    hand = hand.filter(c => !c.selected);
    drawUpToHandSize();

    if (deck.length === 0 && hand.length < HAND_SIZE) {
        endRound();
    }

    updateUI();
}



/* ---------- AVALIAÇÃO ---------- */
function evaluateHand(cards) {
    const handName = identifyHand(cards);
    const rule = HAND_SCORES[handName];

    // soma dos chips das cartas
    const cardChips = cards.reduce((sum, c) => sum + chipValue(c), 0);

    // cálculo final
    return (rule.chips + cardChips) * rule.mult;
}


/* ---------- IDENTIFICAR MÃO ---------- */
function identifyHand(cards) {
    const info = analyzeHand(cards);

    if (info.isRoyal) return "Royal Flush";
    if (info.straight && info.flush) return "Straight Flush";
    if (info.counts.includes(4)) return "Quadra";
    if (info.counts.includes(3) && info.counts.includes(2)) return "Full House";
    if (info.flush) return "Flush";
    if (info.straight) return "Sequência";
    if (info.counts.includes(3)) return "Trinca";
    if (info.counts.filter(v => v === 2).length === 2) return "Dois Pares";
    if (info.counts.includes(2)) return "Par";

    return "High Card";
}


/* ---------- ANÁLISE DA MÃO ---------- */
function analyzeHand(cards) {
    if (cards.length !== 5) {
        return {
            flush: false,
            straight: false,
            counts: []
        };
    }

    const valueMap = { J: 11, Q: 12, K: 13, A: 14 };

    const nums = cards
        .map(c => typeof c.value === "number" ? c.value : valueMap[c.value])
        .sort((a, b) => a - b);

    const suitsOnly = cards.map(c => c.suit);

    const countsMap = {};
    cards.forEach(c => countsMap[c.value] = (countsMap[c.value] || 0) + 1);
    const counts = Object.values(countsMap);

    const flush = suitsOnly.every(s => s === suitsOnly[0]);
    const straight = isStraight(nums);

    const isRoyal =
        flush &&
        JSON.stringify(nums) === JSON.stringify([10, 11, 12, 13, 14]);


    return { flush, straight, counts, isRoyal };
}

function isStraight(nums) {
    const unique = [...new Set(nums)];
    if (unique.length !== 5) return false;

    // normal (ex: 5 6 7 8 9)
    let normal = true;
    for (let i = 1; i < unique.length; i++) {
        if (unique[i] !== unique[i - 1] + 1) {
            normal = false;
            break;
        }
    }

    // Ás baixo (A 2 3 4 5)
    const lowAce =
        JSON.stringify(unique) === JSON.stringify([2, 3, 4, 5, 11]);



    return normal || lowAce;
}

/* ---------- UI ---------- */
function suitColor(suit) {
    if (suit === "♠") return "black";
    if (suit === "♦") return "orange";
    if (suit === "♥") return "red";
    if (suit === "♣") return "blue";
}

function renderHand() {
    const handDiv = document.getElementById("hand");
    handDiv.innerHTML = "";

    hand.forEach((card, index) => {
        const div = document.createElement("div");
        div.className = "card" + (card.selected ? " selected" : "");
        div.innerText = `${card.value}${card.suit}`;
        div.style.color = suitColor(card.suit);
        div.onclick = () => toggleSelect(index);
        handDiv.appendChild(div);
    });
}

function updateUI() {
    document.getElementById("points").innerText = points;
    document.getElementById("plays").innerText = playsLeft;
    document.getElementById("discards").innerText = discardsLeft;
    document.getElementById("deckCount").innerText = deck.length;

    const played = hand.filter(c => c.selected);
    document.getElementById("handName").innerText =
        played.length > 0 ? identifyHand(played) : "—";
}


function showBlindSelection() {
    gameState = "BLIND_SELECT";

    document.getElementById("blind-result-screen").classList.add("hidden");
    document.getElementById("blind-screen").classList.remove("hidden");
    document.getElementById("game-screen").classList.add("hidden");

    const container = document.getElementById("blind-options");
    container.innerHTML = "";

    BLINDS.forEach((blind, index) => {
        const div = document.createElement("div");
        div.className = "blind-card";

        if (index >= unlockedBlinds) {
            div.classList.add("locked");
        } else {
            div.onclick = () => startBlind(blind);
        }

        div.innerHTML = `
        <h3>${blind.name}</h3>
        <p>Meta: ${blind.requirement} pontos</p>
    `;

        container.appendChild(div);
    });

}

function checkBlindWin() {
    if (points >= currentBlind.requirement) {
        endRound();
        return true;
    }
    return false;
}



function startBlind(blind) {
    currentBlind = blind;
    points = 0;

    document.getElementById("blind-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");

    newRound();
}

function endRound() {
    gameState = "BLIND_RESULT";

    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("blind-result-screen").classList.remove("hidden");

    if (points >= currentBlind.requirement) {
        unlockedBlinds = Math.min(unlockedBlinds + 1, BLINDS.length);
        document.getElementById("blind-result-title").innerText =
            "Blind vencida!";
        document.getElementById("blind-result-text").innerText =
            `Você fez ${points} pontos (meta: ${currentBlind.requirement})`;
    } else {
        document.getElementById("blind-result-title").innerText =
            "Derrota";
        document.getElementById("blind-result-text").innerText =
            `Você fez ${points} pontos (meta: ${currentBlind.requirement})`;
    }
}


/* ---------- INIT ---------- */
showBlindSelection();