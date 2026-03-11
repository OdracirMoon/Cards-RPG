import { skillsData, charactersData, mapData, combatFormulas } from './data.js';

const gameState = {
  deck: [],
  hand: [],
  discardPile: [],
  player: null,
  enemy: null,
  battlesWon: 0
};

const campScreen = document.querySelector("#camp-screen");
const combatScreen = document.querySelector("#combat-screen");
const deckPileEl = document.querySelector("#deck-pile");
const discardPileEl = document.querySelector("#discard-pile");
const handEl = document.querySelector("#hand");
const endTurnBtn = document.querySelector("#end-turn-btn");
const exploreBtn = Array.from(document.querySelectorAll(".action-btn")).find((button) =>
  button.textContent.includes("Explorar")
);

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function initEntities() {
  gameState.player = JSON.parse(JSON.stringify(charactersData["caballero"]));
  gameState.player.hpActual = gameState.player.stats.hp;
  gameState.player.epActual = gameState.player.stats.ep;

  const currentZone = mapData[0];

  if (gameState.battlesWon > 0 && gameState.battlesWon % 3 === 0) {
    gameState.enemy = JSON.parse(JSON.stringify(currentZone.boss));
  } else {
    const randomIndex = Math.floor(Math.random() * currentZone.newEnemies.length);
    gameState.enemy = JSON.parse(JSON.stringify(currentZone.newEnemies[randomIndex]));
  }

  gameState.enemy.hpActual = gameState.enemy.hp;
}

function initDeck() {
  gameState.deck = [];
  gameState.hand = [];
  gameState.discardPile = [];

  const classSkillsById = {};
  Object.keys(skillsData).forEach((skillKey) => {
    const skill = skillsData[skillKey];
    if (skill.class === gameState.player.role) {
      classSkillsById[skill.id] = skill;
    }
  });

  const testDeckRecipe = [
    ["golpe_brutal", 3],
    ["grito_guerra", 2],
    ["corte_cruzado", 1]
  ];

  testDeckRecipe.forEach(([skillId, amount]) => {
    const baseSkill = classSkillsById[skillId];
    if (!baseSkill) {
      return;
    }

    for (let i = 0; i < amount; i += 1) {
      gameState.deck.push(JSON.parse(JSON.stringify(baseSkill)));
    }
  });

  shuffleDeck(gameState.deck);
}

function updatePilesUI() {
  if (deckPileEl) {
    deckPileEl.textContent = String(gameState.deck.length);
  }

  if (discardPileEl) {
    discardPileEl.textContent = String(gameState.discardPile.length);
  }
}

function drawCards(amount) {
  for (let i = 0; i < amount; i += 1) {
    if (gameState.deck.length === 0) {
      if (gameState.discardPile.length > 0) {
        gameState.deck = [...gameState.discardPile];
        gameState.discardPile = [];
        shuffleDeck(gameState.deck);
      } else {
        break;
      }
    }

    const drawnCard = gameState.deck.pop();
    gameState.hand.push(drawnCard);
  }
}

function updateStatsUI() {
  if (!gameState.player || !gameState.enemy) {
    return;
  }

  const playerNameEl = document.querySelector(".player-name");
  const playerStatsEl = document.querySelector(".player-stats");
  const playerHpBarEl = document.querySelector(".player-hp");
  const playerManaBarEl = document.querySelector(".player-mana");

  const enemyNameEl = document.querySelector(".enemy-name");
  const enemyHpBarEl = document.querySelector(".enemy-hp");

  if (playerNameEl) {
    playerNameEl.textContent = gameState.player.name;
  }

  if (playerStatsEl) {
    playerStatsEl.textContent = `ATK: ${gameState.player.stats.ad} | DEF: ${gameState.player.stats.armor} | Crit: ${gameState.player.stats.crit * 100}%`;
  }

  if (playerHpBarEl) {
    const playerHpFillEl = playerHpBarEl.querySelector(".resource-fill");
    const playerHpTextEl = playerHpBarEl.querySelector("span");
    const hpPercent = (gameState.player.hpActual / gameState.player.stats.hp) * 100;

    if (playerHpFillEl) {
      playerHpFillEl.style.width = `${Math.max(0, Math.min(100, hpPercent))}%`;
    }

    if (playerHpTextEl) {
      playerHpTextEl.textContent = `HP: ${gameState.player.hpActual} / ${gameState.player.stats.hp}`;
    }
  }

  if (playerManaBarEl) {
    const playerManaFillEl = playerManaBarEl.querySelector(".resource-fill");
    const playerManaTextEl = playerManaBarEl.querySelector("span");
    const epPercent = (gameState.player.epActual / gameState.player.stats.ep) * 100;

    if (playerManaFillEl) {
      playerManaFillEl.style.width = `${Math.max(0, Math.min(100, epPercent))}%`;
    }

    if (playerManaTextEl) {
      playerManaTextEl.textContent = `Energía: ${gameState.player.epActual} / ${gameState.player.stats.ep}`;
    }
  }

  if (enemyNameEl) {
    enemyNameEl.textContent = gameState.enemy.name;
  }

  if (enemyHpBarEl) {
    const enemyHpFillEl = enemyHpBarEl.querySelector(".resource-fill");
    const enemyHpTextEl = enemyHpBarEl.querySelector("span");
    const enemyHpPercent = (gameState.enemy.hpActual / gameState.enemy.hp) * 100;

    if (enemyHpFillEl) {
      enemyHpFillEl.style.width = `${Math.max(0, Math.min(100, enemyHpPercent))}%`;
    }

    if (enemyHpTextEl) {
      enemyHpTextEl.textContent = `HP: ${gameState.enemy.hpActual} / ${gameState.enemy.hp}`;
    }
  }
}

function endCombat() {
  combatScreen.classList.remove("is-visible");
  campScreen.classList.add("is-visible");

  gameState.hand = [];
  gameState.deck = [];
  gameState.discardPile = [];

  renderHand();
  updatePilesUI();
}

function playerEndTurn() {
  gameState.discardPile.push(...gameState.hand);
  gameState.hand = [];

  renderHand();
  updatePilesUI();

  setTimeout(enemyTurn, 600);
}

function enemyTurn() {
  let dmg = Math.max(1, gameState.enemy.atk - Math.floor(gameState.player.stats.armor / 3));

  gameState.player.hpActual = Math.max(0, gameState.player.hpActual - dmg);

  alert('¡El ' + gameState.enemy.name + ' ataca y te hace ' + dmg + ' de daño!');

  updateStatsUI();

  if (gameState.player.hpActual <= 0) {
    alert('💀 Has muerto...');
    endCombat();
    return;
  }

  startNewTurn();
}

function startNewTurn() {
  gameState.player.epActual = gameState.player.stats.ep;
  drawCards(4);
  updateStatsUI();
  renderHand();
  updatePilesUI();
}

function playCard(index) {
  const card = gameState.hand[index];

  if (!card) {
    return;
  }

  if (gameState.player.epActual < card.cost) {
    alert('¡No tienes suficiente Energía!');
    return;
  }

  gameState.player.epActual -= card.cost;

  let damage = 0;
  switch (card.id) {
    case 'golpe_brutal':
      damage = Math.floor(gameState.player.stats.ad * combatFormulas.golpeBrutalMultiplier);
      break;
    case 'corte_cruzado':
      damage = Math.floor(
        gameState.player.stats.ad
          * combatFormulas.corteCruzadoMultiplier
          * combatFormulas.corteCruzadoHits
      );
      break;
    case 'grito_guerra':
      gameState.player.stats.armor += combatFormulas.defBuffBonus;
      alert('¡Defensa aumentada!');
      break;
    default:
      break;
  }

  if (damage > 0) {
    gameState.enemy.hpActual = Math.max(0, gameState.enemy.hpActual - damage);
  }

  const playedCards = gameState.hand.splice(index, 1);
  const playedCard = playedCards[0];
  gameState.discardPile.push(playedCard);

  updateStatsUI();
  renderHand();
  updatePilesUI();

  if (gameState.enemy.hpActual <= 0) {
    gameState.enemy.hpActual = 0;
    updateStatsUI();
    gameState.battlesWon += 1;

    setTimeout(() => {
      alert('🏆 ¡Enemigo derrotado! Has ganado la batalla.');
      endCombat();
    }, 300);
  }
}

function renderHand() {
  if (!handEl) {
    return;
  }

  handEl.innerHTML = "";

  gameState.hand.forEach((card, index) => {
    const cardEl = document.createElement("article");
    cardEl.className = "card";
    cardEl.style.cursor = 'pointer';

    cardEl.innerHTML = `
      <div class="card-cost">${card.cost}</div>
      <h4 class="card-title">${card.icon} ${card.name}</h4>
      <p class="card-text">${card.desc}</p>
    `;

    cardEl.addEventListener('click', () => playCard(index));

    handEl.appendChild(cardEl);
  });
}

function showCombatScreen() {
  if (!campScreen || !combatScreen) {
    return;
  }

  campScreen.classList.remove("is-visible");
  combatScreen.classList.add("is-visible");
}

function startCombat() {
  initEntities();
  showCombatScreen();
  initDeck();
  drawCards(4);
  updateStatsUI();
  renderHand();
  updatePilesUI();
}

if (exploreBtn) {
  exploreBtn.addEventListener("click", startCombat);
}

if (endTurnBtn) {
  endTurnBtn.addEventListener("click", playerEndTurn);
}

window.gameState = gameState;
