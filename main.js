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
const roleSelectScreen = document.querySelector("#role-select-screen");
const charSelectScreen = document.querySelector("#char-select-screen");
const charListEl = document.querySelector("#char-list");
const btnBackToRoles = document.querySelector("#back-to-roles");
const notificationArea = document.querySelector("#notification-area");
const roleCards = document.querySelectorAll(".role-card");
const deckPileEl = document.querySelector("#deck-pile");
const discardPileEl = document.querySelector("#discard-pile");
const handEl = document.querySelector("#hand");
const endTurnBtn = document.querySelector("#end-turn-btn");
const exploreBtn = Array.from(document.querySelectorAll(".action-btn")).find((button) =>
  button.textContent.includes("Explorar")
);

let selectedRole = null;

function showNotification(msg) {
  if (!notificationArea) {
    return;
  }

  const notifEl = document.createElement("div");
  notifEl.className = "in-game-notif";
  notifEl.textContent = msg;
  notificationArea.appendChild(notifEl);

  setTimeout(() => {
    notifEl.remove();
  }, 2500);
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function initEntities() {
  const currentZone = mapData[0];

  if (gameState.battlesWon > 0 && gameState.battlesWon % 3 === 0) {
    gameState.enemy = JSON.parse(JSON.stringify(currentZone.boss));
  } else {
    const randomIndex = Math.floor(Math.random() * currentZone.newEnemies.length);
    gameState.enemy = JSON.parse(JSON.stringify(currentZone.newEnemies[randomIndex]));
  }

  // Escalado Infinito: +20% de stats por cada batalla ganada
  const scale = 1 + (gameState.battlesWon * 0.20);
  gameState.enemy.hp = Math.floor(gameState.enemy.hp * scale);
  gameState.enemy.atk = Math.floor(gameState.enemy.atk * scale);
  gameState.enemy.hpActual = gameState.enemy.hp;
}

function selectCharacter(charKey) {
  gameState.player = JSON.parse(JSON.stringify(charactersData[charKey]));
  gameState.player.hpActual = gameState.player.stats.hp;
  gameState.player.epActual = gameState.player.stats.ep;

  charSelectScreen.classList.remove("is-visible");
  campScreen.classList.add("is-visible");
}

function renderCharList(role) {
  if (!charListEl) {
    return;
  }

  charListEl.innerHTML = "";

  Object.keys(charactersData).forEach((key) => {
    const charData = charactersData[key];
    if (charData.role !== role) {
      return;
    }

    const charCard = document.createElement("div");
    charCard.className = "char-card";
    charCard.innerHTML = `
      <h3 class="char-name">${charData.name}</h3>
      <div class="char-role">${charData.role}</div>
      <p class="char-desc">${charData.desc}</p>
    `;

    charCard.addEventListener('click', () => selectCharacter(key));
    charListEl.appendChild(charCard);
  });
}

function showRoleSelection() {
  selectedRole = null;
  charSelectScreen.classList.remove("is-visible");
  campScreen.classList.remove("is-visible");
  roleSelectScreen.classList.add("is-visible");
}

function openCharacterSelection(role) {
  selectedRole = role;
  roleSelectScreen.classList.remove("is-visible");
  charSelectScreen.classList.add("is-visible");
  renderCharList(role);
}

function initDeck() {
  gameState.deck = [];
  gameState.hand = [];
  gameState.discardPile = [];

  Object.keys(skillsData).forEach((skillKey) => {
    const skill = skillsData[skillKey];
    // Si la carta pertenece a la clase del jugador, metemos 2 copias al mazo
    if (skill.class === gameState.player.role) {
      gameState.deck.push(JSON.parse(JSON.stringify(skill)));
      gameState.deck.push(JSON.parse(JSON.stringify(skill)));
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

  const enemyPortraitEl = document.querySelector(".enemy-portrait");
  if (enemyPortraitEl && gameState.enemy.img) {
    enemyPortraitEl.innerHTML = `<img src="${gameState.enemy.img}" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.innerHTML='ENEMIGO';">`;
  }
  const playerPortraitEl = document.querySelector(".player-portrait");
  if (playerPortraitEl && gameState.player.imgs && gameState.player.imgs.combat) {
    playerPortraitEl.innerHTML = `<img src="${gameState.player.imgs.combat}" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.innerHTML='HEROE';">`;
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

  showNotification('¡El ' + gameState.enemy.name + ' ataca y te hace ' + dmg + ' de dano!');

  updateStatsUI();

  if (gameState.player.hpActual <= 0) {
    showNotification('💀 Has muerto...');
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
    showNotification('¡No tienes suficiente Energia!');
    return;
  }

  gameState.player.epActual -= card.cost;

  let damage = 0;
  switch (card.id) {
    // --- CARTAS DE GUERRERO ---
    case 'golpe_brutal': damage = Math.floor(gameState.player.stats.ad * combatFormulas.golpeBrutalMultiplier); break;
    case 'corte_cruzado': damage = Math.floor(gameState.player.stats.ad * combatFormulas.corteCruzadoMultiplier * combatFormulas.corteCruzadoHits); break;
    case 'grito_guerra': gameState.player.stats.armor += combatFormulas.defBuffBonus; showNotification('¡Defensa aumentada!'); break;
    case 'piel_hierro': gameState.player.stats.armor += 5; gameState.player.hpActual = Math.min(gameState.player.stats.hp, gameState.player.hpActual + 10); showNotification('¡Piel de Hierro (+Def, +Cura)!'); break;

    // --- CARTAS DE ARQUERO ---
    case 'tiro_doble': damage = Math.floor(gameState.player.stats.ad * combatFormulas.tiroDobleMultiplier * combatFormulas.tiroDobleHits); break;
    case 'lluvia_flechas': damage = Math.floor(gameState.player.stats.ad * combatFormulas.lluviaFlechasMultiplier * combatFormulas.lluviaFlechasHits); break;
    case 'flecha_venenosa': damage = Math.floor(gameState.player.stats.ad * combatFormulas.flechaVenenosaMultiplier); showNotification('¡Enemigo envenenado!'); break;
    case 'trampa_espinas': damage = Math.floor(gameState.player.stats.ad * combatFormulas.trampaEspinasMultiplier); showNotification('¡Trampa letal activada!'); break;

    // --- CARTAS DE MAGO (Usan AP en lugar de AD) ---
    case 'fuego': damage = Math.floor(gameState.player.stats.ap * combatFormulas.fuegoMultiplier); break;
    case 'meteorito': damage = Math.floor(gameState.player.stats.ap * combatFormulas.meteoritoMultiplier); break;
    case 'curar': 
        const cura = Math.floor((gameState.player.stats.ap * combatFormulas.curarMultiplier) + combatFormulas.curarBonus);
        gameState.player.hpActual = Math.min(gameState.player.stats.hp, gameState.player.hpActual + cura); 
        showNotification('¡Te has curado ' + cura + ' HP!'); 
        break;
    case 'drenar_vida':
        damage = Math.floor(gameState.player.stats.ap * combatFormulas.drenarVidaMultiplier);
        const robo = Math.floor(damage * combatFormulas.drenarVidaHealPercent);
        gameState.player.hpActual = Math.min(gameState.player.stats.hp, gameState.player.hpActual + robo);
        showNotification('¡Drenaste ' + robo + ' HP!');
        break;
  }

  if (damage > 0 && card.type && gameState.enemy.type) {
    const elementMatrix = combatFormulas.typeChart[card.type];
    const multiplier = (elementMatrix && elementMatrix[gameState.enemy.type]) ? elementMatrix[gameState.enemy.type] : 1;

    damage = Math.floor(damage * multiplier);

    if (multiplier === 2) {
      showNotification('¡Super Efectivo! (x2)');
    } else if (multiplier === 0.5) {
      showNotification('Poco efectivo... (x0.5)');
    }
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
      showNotification('🏆 ¡Enemigo derrotado! Has ganado la batalla.');
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
      <img class="card-art" src="img/cards/${card.id}.png" alt="${card.name}" onerror="this.style.display='none';">
      <div class="card-body">
        <div class="card-cost">${card.cost}</div>
        <h4 class="card-title">${card.icon} ${card.name}</h4>
        <span class="card-type">${card.type}</span>
        <p class="card-text">${card.desc}</p>
      </div>
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

if (btnBackToRoles) {
  btnBackToRoles.addEventListener("click", showRoleSelection);
}

roleCards.forEach((card) => {
  card.addEventListener("click", () => {
    const role = card.dataset.role;
    if (!role) {
      return;
    }
    openCharacterSelection(role);
  });
});

window.gameState = gameState;
