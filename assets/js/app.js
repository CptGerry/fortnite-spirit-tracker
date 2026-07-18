"use strict";

/* ========================================
ELEMENTOS DE LA PÁGINA
======================================== */

const grid = document.getElementById("grid");
const counter = document.getElementById("counter");
const percentage = document.getElementById("percentage");
const progressBar = document.getElementById("progress-bar");
const dustValue = document.getElementById("dust-value");
const searchInput = document.getElementById("search");
const noResults = document.getElementById("no-results");
const languageButton = document.getElementById("language-button");
const subtitle = document.getElementById("subtitle");
const progressLabel = document.getElementById("progress-label");
const collectionLabel = document.getElementById("collection-label");
const dustLabel = document.getElementById("dust-label");
const rarityTitle = document.getElementById("rarity-title");
const variantTitle = document.getElementById("variant-title");
const shareButton = document.getElementById("share-button");
const shareMessage = document.getElementById("share-message");
const sharedPanel = document.getElementById("shared-panel");
const sharedTitle = document.getElementById("shared-title");
const sharedDescription = document.getElementById("shared-description");
const compareButton = document.getElementById("compare-button");
const importButton = document.getElementById("import-button");
const myCollectionButton = document.getElementById("my-collection-button");
const comparisonResults = document.getElementById("comparison-results");
const bothCount = document.getElementById("both-count");
const onlyMineCount = document.getElementById("only-mine-count");
const onlySharedCount = document.getElementById("only-shared-count");
const bothLabel = document.getElementById("both-label");
const onlyMineLabel = document.getElementById("only-mine-label");
const onlySharedLabel = document.getElementById("only-shared-label");
const collectorNameInput = document.getElementById("collector-name");
const downloadImageButton = document.getElementById("download-image-button");
const imageMessage = document.getElementById("image-message");

/* ========================================
ESTADO DE LA APLICACIÓN
======================================== */

let spirits = [];

let currentLanguage = localStorage.getItem("spiritTrackerLanguage") || "es";

let currentCollectionFilter = "all";
let currentRarityFilter = "all";
let currentVariantFilter = "all";
let currentSearch = "";

let collection = loadCollection();

let sharedCollection = null;
let isSharedMode = false;

function getActiveCollection() {
  return isSharedMode ? sharedCollection : collection;
}

/* ========================================
TRADUCCIONES
======================================== */

const translations = {
  es: {
    subtitle: "Sigue tu colección de Espíritus de Fortnite",
    completed: "Completado",
    collection: "Colección",
    dust: "Polvo invertido",
    search: "Buscar espíritu...",
    rarity: "Rareza",
    variant: "Variante",
    owned: "En mi colección",
    noResults: "No se encontraron espíritus.",
    rare: "Raro",
    epic: "Épico",
    legendary: "Legendario",
    mythic: "Mítico",
    special: "Especial",
    base: "Base",
    gold: "Oro",
    gummy: "Gomita",
    galaxy: "Galaxia",
    holofoil: "Holofoil",
    gem: "Gema",
  },

  en: {
    subtitle: "Track your Fortnite Spirits collection",
    completed: "Completed",
    collection: "Collection",
    dust: "Dust invested",
    search: "Search spirit...",
    rarity: "Rarity",
    variant: "Variant",
    owned: "In my collection",
    noResults: "No spirits found.",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
    mythic: "Mythic",
    special: "Special",
    base: "Base",
    gold: "Gold",
    gummy: "Gummy",
    galaxy: "Galaxy",
    holofoil: "Holofoil",
    gem: "Gem",
  },
};

/* ========================================
    CARGAR JSON
    ======================================== */

async function loadSpirits() {
  try {
    const response = await fetch("data/spirits.json");

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    spirits = prepareSpiritOrder(await response.json());

    migrateLegacyCollection();
    loadSharedCollection();
    render();
  } catch (error) {
    console.error("No se pudieron cargar los espíritus:", error);

    noResults.hidden = false;

    noResults.textContent =
      currentLanguage === "es"
        ? "No se pudieron cargar los espíritus."
        : "The spirits could not be loaded.";
  }
}

/* ========================================
    CONVERTIR CSV
======================================== */

function parseCSV(csvText) {
  const rows = parseCSVRows(csvText);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row, index) => {
      const record = {};

      headers.forEach((header, columnIndex) => {
        record[header] = row[columnIndex]?.trim() || "";
      });

      const names = separateNames(record.Nombre);

      const imageNumber = index + 1;

      const variant = normalizeVariant(record.Variante);

      const id = createStableId(names.en || names.es, variant);

      return {
        id,
        legacyId: imageNumber,
        name: names,
        rarity: normalizeRarity(record.Rareza),
        variant,
        price: parsePrice(record["Coste de Polvo"]),
        image: `assets/spirits/${String(imageNumber).padStart(3, "0")}.webp`,
      };
    });
}

/*
    Esta función admite:
    - comas dentro de comillas
    - campos entre comillas
    - saltos de línea normales
*/

function parseCSVRows(csvText) {
  const rows = [];

  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const character = csvText[i];
    const nextCharacter = csvText[i + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      cell += '"';
      i++;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        i++;
      }

      row.push(cell);
      rows.push(row);

      row = [];
      cell = "";

      continue;
    }

    cell += character;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

/* ========================================
   SEPARAR NOMBRES ES / EN
======================================== */

function separateNames(fullName) {
  const match = fullName.match(/^(.*?)\s*\(([^()]*)\)\s*$/);

  if (!match) {
    return {
      es: fullName.trim(),
      en: fullName.trim(),
    };
  }

  return {
    es: match[1].trim(),
    en: match[2].trim(),
  };
}

/* ========================================
   NORMALIZAR DATOS
======================================== */

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeRarity(rarity) {
  const value = normalizeText(rarity);

  const rarityMap = {
    rara: "rare",
    raro: "rare",
    rare: "rare",

    epica: "epic",
    epico: "epic",
    epic: "epic",

    legendaria: "legendary",
    legendario: "legendary",
    legendary: "legendary",

    mitica: "mythic",
    mitico: "mythic",
    mythic: "mythic",

    especial: "special",
    special: "special",
  };

  return rarityMap[value] || value;
}

function normalizeVariant(variant) {
  const value = normalizeText(variant);

  if (value.includes("oro") || value.includes("gold")) {
    return "gold";
  }

  if (value.includes("gomita") || value.includes("gummy")) {
    return "gummy";
  }

  if (value.includes("galaxia") || value.includes("galaxy")) {
    return "galaxy";
  }

  if (value.includes("holografica") || value.includes("holofoil")) {
    return "holofoil";
  }

  if (value.includes("gema") || value.includes("gem")) {
    return "gem";
  }

  return "base";
}

function parsePrice(price) {
  const number = Number(String(price).replace(/[^\d.-]/g, ""));

  return Number.isFinite(number) ? number : 0;
}

function createStableId(name, variant) {
  const normalizedName = normalizeText(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const normalizedVariant = normalizeVariant(variant);

  return `${normalizedName}-${normalizedVariant}`;
}

/* ========================================
   ORDEN DE LA COLECCIÓN
======================================== */

const rarityOrder = {
  rare: 0,
  epic: 1,
  legendary: 2,
  mythic: 3,
  special: 4,
};

const variantOrder = {
  base: 0,
  gold: 1,
  gummy: 2,
  galaxy: 3,
  holofoil: 4,
  gem: 5,
};

function getSpiritFamilyName(spirit) {
  const englishName = spirit.name?.en || spirit.name?.es || "";

  return englishName
    .replace(/^(Gold|Gummy|Galaxy|Holofoil|Gem)\s+/i, "")
    .replace(/\s+Sprite$/i, "")
    .trim();
}

function prepareSpiritOrder(items) {
  const baseRarityByFamily = new Map();
  const familyOrder = new Map();

  items.forEach((spirit, index) => {
    const family = normalizeText(getSpiritFamilyName(spirit));

    if (!familyOrder.has(family)) {
      familyOrder.set(family, index);
    }

    if (spirit.variant === "base") {
      baseRarityByFamily.set(family, spirit.rarity);
      familyOrder.set(family, index);
    }
  });

  return [...items].sort((a, b) => {
    const familyA = normalizeText(getSpiritFamilyName(a));
    const familyB = normalizeText(getSpiritFamilyName(b));

    const baseRarityA =
      a.baseRarity ||
      baseRarityByFamily.get(familyA) ||
      (a.rarity === "special" ? "mythic" : a.rarity);

    const baseRarityB =
      b.baseRarity ||
      baseRarityByFamily.get(familyB) ||
      (b.rarity === "special" ? "mythic" : b.rarity);

    const rarityDifference =
      (rarityOrder[baseRarityA] ?? 99) -
      (rarityOrder[baseRarityB] ?? 99);

    if (rarityDifference !== 0) {
      return rarityDifference;
    }

    const familyDifference =
      (familyOrder.get(familyA) ?? 9999) -
      (familyOrder.get(familyB) ?? 9999);

    if (familyDifference !== 0) {
      return familyDifference;
    }

    return (
      (variantOrder[a.variant] ?? 99) -
      (variantOrder[b.variant] ?? 99)
    );
  });
}

/* ========================================
COLECCIÓN GUARDADA
======================================== */

function loadCollection() {
  try {
    const storedCollection = localStorage.getItem("spiritTrackerCollection");

    return storedCollection ? JSON.parse(storedCollection) : {};
  } catch (error) {
    console.error("No se pudo leer la colección guardada:", error);

    return {};
  }
}

function migrateLegacyCollection() {
  const alreadyMigrated = localStorage.getItem(
    "spiritTrackerStableIdsMigrated",
  );

  if (alreadyMigrated === "true") {
    return;
  }

  const migratedCollection = {};

  spirits.forEach((spirit) => {
    const wasOwned =
      collection[spirit.legacyId] === true ||
      collection[String(spirit.legacyId)] === true ||
      collection[spirit.id] === true;

    if (wasOwned) {
      migratedCollection[spirit.id] = true;
    }
  });

  collection = migratedCollection;

  saveCollection();

  localStorage.setItem("spiritTrackerStableIdsMigrated", "true");
}

function saveCollection() {
  localStorage.setItem("spiritTrackerCollection", JSON.stringify(collection));
}

/* ========================================
   FILTRAR ESPÍRITUS
======================================== */

function getFilteredSpirits() {
  const activeCollection = getActiveCollection();
  const normalizedSearch = normalizeText(currentSearch);

  return spirits.filter((spirit) => {
    const isOwned = activeCollection[spirit.id] === true;

    const nameMatches =
      normalizeText(spirit.name.es).includes(normalizedSearch) ||
      normalizeText(spirit.name.en).includes(normalizedSearch);

    const collectionMatches =
      currentCollectionFilter === "all" ||
      (currentCollectionFilter === "owned" && isOwned) ||
      (currentCollectionFilter === "missing" && !isOwned);

    const rarityMatches =
      currentRarityFilter === "all" || spirit.rarity === currentRarityFilter;

    const variantMatches =
      currentVariantFilter === "all" || spirit.variant === currentVariantFilter;

    return nameMatches && collectionMatches && rarityMatches && variantMatches;
  });
}

/* ========================================
MOSTRAR TARJETAS
======================================== */

function render() {
  grid.innerHTML = "";

  const filteredSpirits = getFilteredSpirits();
  const activeCollection = getActiveCollection();

  filteredSpirits.forEach((spirit) => {
    const isOwned = activeCollection[spirit.id] === true;

    const card = document.createElement("article");

    card.className = `card ${spirit.rarity} ${spirit.variant}`;

    card.dataset.id = spirit.id;

    if (isOwned) {
      card.classList.add("owned");
    }

    card.innerHTML = `

    <div class="card-image-wrapper">

        <img
            class="card-image"
            src="${spirit.image}"
            alt="${escapeHTML(spirit.name[currentLanguage])}"
            loading="lazy"
        >

        <div
            class="owned-check"
            aria-hidden="true"
        >
            ✓
        </div>

        <div class="dust-cost">

            <img
                class="dust-icon"
                src="assets/icons/dust.webp"
                alt=""
                aria-hidden="true"
            >

            <span>
                ${formatNumber(spirit.price)}
            </span>

        </div>

    </div>

    <div class="card-content">

        <h3 class="card-title">
            ${escapeHTML(spirit.name[currentLanguage])}
        </h3>

    </div>

`;

    grid.appendChild(card);
  });

  noResults.hidden = filteredSpirits.length !== 0;

  updateStatistics();
  addCardEvents();
}

/* ========================================
    CHECKBOXES
======================================== */

function addCardEvents() {
  if (isSharedMode) {
    return;
  }

  const cards = grid.querySelectorAll(".card[data-id]");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;

      collection[id] = collection[id] !== true;

      saveCollection();
      render();
    });
  });
}

/* ========================================
ESTADÍSTICAS
======================================== */

function updateStatistics() {
  const activeCollection = getActiveCollection();

  const ownedSpirits = spirits.filter(
    (spirit) => activeCollection[spirit.id] === true,
  );

  const ownedCount = ownedSpirits.length;

  const total = spirits.length;

  const completedPercentage =
    total > 0 ? Math.round((ownedCount / total) * 100) : 0;

  const totalDust = ownedSpirits.reduce((sum, spirit) => sum + spirit.price, 0);

  counter.textContent = `${ownedCount} / ${total}`;

  percentage.textContent = `${completedPercentage}%`;

  progressBar.style.width = `${completedPercentage}%`;

  dustValue.textContent = formatNumber(totalDust);
}

/* ========================================
   BOTONES DE FILTRO
======================================== */

document.querySelectorAll("[data-collection]").forEach((button) => {
  button.addEventListener("click", () => {
    currentCollectionFilter = button.dataset.collection;

    setActiveButton("[data-collection]", button);

    render();
  });
});

document.querySelectorAll("[data-rarity]").forEach((button) => {
  button.addEventListener("click", () => {
    currentRarityFilter = button.dataset.rarity;

    setActiveButton("[data-rarity]", button);

    render();
  });
});

document.querySelectorAll("[data-variant]").forEach((button) => {
  button.addEventListener("click", () => {
    currentVariantFilter = button.dataset.variant;

    setActiveButton("[data-variant]", button);

    render();
  });
});

function setActiveButton(selector, activeButton) {
  document.querySelectorAll(selector).forEach((button) => {
    button.classList.remove("active");
  });

  activeButton.classList.add("active");
}

/* ========================================
   BUSCADOR
======================================== */

searchInput.addEventListener("input", (event) => {
  currentSearch = event.target.value;

  render();
});

/* ========================================
   IDIOMA
======================================== */

languageButton.addEventListener("click", () => {
  currentLanguage = currentLanguage === "es" ? "en" : "es";

  localStorage.setItem("spiritTrackerLanguage", currentLanguage);

  updateLanguage();
  render();
});

function updateLanguage() {
  const text = translations[currentLanguage];

  document.documentElement.lang = currentLanguage;

  languageButton.textContent = currentLanguage === "es" ? "EN" : "ES";

  subtitle.textContent = text.subtitle;

  progressLabel.textContent = text.completed;

  collectionLabel.textContent = text.collection;

  dustLabel.textContent = text.dust;

  rarityTitle.textContent = text.rarity;

  variantTitle.textContent = text.variant;

  searchInput.placeholder = text.search;

  noResults.textContent = text.noResults;

  updateFilterTexts();

  if (currentLanguage === "es") {
    sharedTitle.textContent = "Estás viendo la colección de otra persona";

    sharedDescription.textContent = "Tu colección personal permanece guardada.";

    compareButton.textContent = "Comparar";

    importButton.textContent = "Importar colección";

    myCollectionButton.textContent = "Volver a mi colección";

    bothLabel.textContent = "Ambos tienen";

    onlyMineLabel.textContent = "Solo tú tienes";

    onlySharedLabel.textContent = "Solo la otra colección tiene";
  } else {
    sharedTitle.textContent = "You are viewing another person's collection";

    sharedDescription.textContent = "Your personal collection remains saved.";

    compareButton.textContent = "Compare";

    importButton.textContent = "Import collection";

    myCollectionButton.textContent = "Return to my collection";

    bothLabel.textContent = "Both own";

    onlyMineLabel.textContent = "Only you own";

    onlySharedLabel.textContent = "Only the shared collection owns";
  }
}

function updateFilterTexts() {
  const isSpanish = currentLanguage === "es";

  const collectionTexts = isSpanish
    ? ["Todos", "Tengo", "Me faltan"]
    : ["All", "Owned", "Missing"];

  document.querySelectorAll("[data-collection]").forEach((button, index) => {
    button.textContent = collectionTexts[index];
  });

  const rarityTexts = {
    all: isSpanish ? "Todas" : "All",
    rare: isSpanish ? "Raro" : "Rare",
    epic: isSpanish ? "Épico" : "Epic",
    legendary: isSpanish ? "Legendario" : "Legendary",
    mythic: isSpanish ? "Mítico" : "Mythic",
    special: isSpanish ? "Especial" : "Special",
  };

  document.querySelectorAll("[data-rarity]").forEach((button) => {
    button.textContent = rarityTexts[button.dataset.rarity];
  });

  const variantTexts = {
    all: isSpanish ? "Todas" : "All",
    base: "Base",
    gold: isSpanish ? "Oro" : "Gold",
    gummy: `🍉 ${isSpanish ? "Gomita" : "Gummy"}`,
    galaxy: `🌌 ${isSpanish ? "Galaxia" : "Galaxy"}`,
    holofoil: "✨ Holofoil",
    gem: `💎 ${isSpanish ? "Gema" : "Gem"}`,
  };

  document.querySelectorAll("[data-variant]").forEach((button) => {
    button.textContent = variantTexts[button.dataset.variant];
  });
}

/* ========================================
   ETIQUETAS
======================================== */

function getRarityLabel(rarity) {
  const text = translations[currentLanguage];

  const labels = {
    rare: text.rare,
    epic: text.epic,
    legendary: text.legendary,
    mythic: text.mythic,
  };

  return labels[rarity] || rarity;
}

function getVariantLabel(variant) {
  const text = translations[currentLanguage];

  const labels = {
    base: text.base,
    gold: text.gold,
    gummy: text.gummy,
    galaxy: text.galaxy,
    holofoil: text.holofoil,
    gem: text.gem,
  };

  return labels[variant] || variant;
}

function getVariantIcon(variant) {
  const icons = {
    base: "⚪",
    gold: "🟡",
    gummy: "🍉",
    galaxy: "🌌",
    holofoil: "✨",
    gem: "💎",
  };

  return icons[variant] || "";
}

/* ========================================
   UTILIDADES
======================================== */

function formatNumber(number) {
  return new Intl.NumberFormat(
    currentLanguage === "es" ? "es-MX" : "en-US",
  ).format(number);
}

function escapeHTML(text) {
  const element = document.createElement("div");

  element.textContent = String(text);

  return element.innerHTML;
}

/* ========================================
   COMPARTIR COLECCIÓN
======================================== */

function encodeCollection() {
  /*
        Cada espíritu se representa con:

        1 = lo tengo
        0 = no lo tengo

        Ejemplo:
        1011001...
    */

  const bits = spirits
    .map((spirit) => (collection[spirit.id] === true ? "1" : "0"))
    .join("");

  /*
        Convertimos grupos de bits
        en caracteres hexadecimales.

        1111 → f
        1010 → a

        Esto hace la URL más corta.
    */

  let encoded = "";

  for (let i = 0; i < bits.length; i += 4) {
    const group = bits.slice(i, i + 4).padEnd(4, "0");

    encoded += parseInt(group, 2).toString(16);
  }

  return encoded;
}

function decodeCollection(encoded) {
  if (!encoded) {
    return null;
  }

  /*
        Comprobamos que el código
        solamente contenga hexadecimal.
    */

  if (!/^[0-9a-f]+$/i.test(encoded)) {
    return null;
  }

  let bits = "";

  for (const character of encoded) {
    bits += parseInt(character, 16).toString(2).padStart(4, "0");
  }

  const decodedCollection = {};

  spirits.forEach((spirit, index) => {
    decodedCollection[spirit.id] = bits[index] === "1";
  });

  return decodedCollection;
}

function createShareURL() {
  const encodedCollection = encodeCollection();

  const url = new URL(window.location.href);

  url.searchParams.set("c", encodedCollection);

  /*
        Eliminamos cualquier fragmento
        que pudiera tener la URL.
    */

  url.hash = "";

  return url.toString();
}

async function copyShareURL() {
  const shareURL = createShareURL();

  try {
    await navigator.clipboard.writeText(shareURL);

    showShareMessage(
      currentLanguage === "es" ? "✓ Enlace copiado" : "✓ Link copied",
    );
  } catch (error) {
    console.error("No se pudo copiar el enlace:", error);

    /*
            Alternativa para navegadores
            donde Clipboard API falle.
        */

    window.prompt(
      currentLanguage === "es" ? "Copia este enlace:" : "Copy this link:",
      shareURL,
    );
  }
}

function showShareMessage(message) {
  shareMessage.textContent = message;

  clearTimeout(showShareMessage.timeout);

  showShareMessage.timeout = setTimeout(() => {
    shareMessage.textContent = "";
  }, 3000);
}

function loadSharedCollection() {
  const url = new URL(window.location.href);

  const encodedCollection = url.searchParams.get("c");

  if (!encodedCollection) {
    return false;
  }

  const decoded = decodeCollection(encodedCollection);

  if (!decoded) {
    return false;
  }

  sharedCollection = decoded;
  isSharedMode = true;

  document.body.classList.add("shared-mode");

  sharedPanel.hidden = false;

  return true;
}

shareButton.addEventListener("click", copyShareURL);

/* ========================================
   MODO COMPARTIDO
======================================== */

function compareCollections() {
  if (!sharedCollection) {
    return;
  }

  let both = 0;
  let onlyMine = 0;
  let onlyShared = 0;

  spirits.forEach((spirit) => {
    const mine = collection[spirit.id] === true;

    const shared = sharedCollection[spirit.id] === true;

    if (mine && shared) {
      both++;
    } else if (mine) {
      onlyMine++;
    } else if (shared) {
      onlyShared++;
    }
  });

  bothCount.textContent = both;
  onlyMineCount.textContent = onlyMine;
  onlySharedCount.textContent = onlyShared;

  comparisonResults.hidden = false;
}

function importSharedCollection() {
  if (!sharedCollection) {
    return;
  }

  const message =
    currentLanguage === "es"
      ? "Esto reemplazará tu colección personal. ¿Continuar?"
      : "This will replace your personal collection. Continue?";

  const confirmed = window.confirm(message);

  if (!confirmed) {
    return;
  }

  collection = {
    ...sharedCollection,
  };

  saveCollection();
  leaveSharedMode();

  showShareMessage(
    currentLanguage === "es"
      ? "✓ Colección importada"
      : "✓ Collection imported",
  );
}

function leaveSharedMode() {
  isSharedMode = false;
  sharedCollection = null;

  document.body.classList.remove("shared-mode");

  sharedPanel.hidden = true;
  comparisonResults.hidden = true;

  const url = new URL(window.location.href);

  url.searchParams.delete("c");

  window.history.replaceState({}, "", url);

  render();
}

compareButton.addEventListener("click", compareCollections);

importButton.addEventListener("click", importSharedCollection);

myCollectionButton.addEventListener("click", leaveSharedMode);

collectorNameInput.value =
  localStorage.getItem("spiritTrackerCollectorName") || "";

collectorNameInput.addEventListener("input", () => {
  localStorage.setItem(
    "spiritTrackerCollectorName",
    collectorNameInput.value.trim(),
  );
});

/* ========================================
   GENERAR PNG DE LA COLECCIÓN
======================================== */

async function generateCollectionImage() {
  if (spirits.length === 0) {
    return;
  }

  downloadImageButton.disabled = true;

  imageMessage.textContent =
    currentLanguage === "es" ? "Generando imagen..." : "Generating image...";

  try {
    const activeCollection = getActiveCollection();

    const ownedCount = spirits.filter(
      (spirit) => activeCollection[spirit.id] === true,
    ).length;

    const total = spirits.length;

    const percent = total > 0 ? Math.round((ownedCount / total) * 100) : 0;

    const collectorName =
      collectorNameInput.value.trim() ||
      (currentLanguage === "es" ? "Mi colección" : "My collection");

    /*
            Dimensiones pensadas para compartir
            en Discord, Facebook y otras redes.
        */

    const canvasWidth = 1400;
    const outerPadding = 55;

    const columns = 9;
    const cardGap = 14;

    const availableWidth = canvasWidth - outerPadding * 2;

    const cardWidth = Math.floor(
      (availableWidth - cardGap * (columns - 1)) / columns,
    );

    const cardHeight = cardWidth;

    const rows = Math.ceil(spirits.length / columns);

    const headerHeight = 285;

    const gridHeight = rows * cardHeight + (rows - 1) * cardGap;

    const footerHeight = 20;

    const canvasHeight =
      headerHeight + gridHeight + footerHeight + outerPadding;

    const canvas = document.createElement("canvas");

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas no disponible");
    }

    /*
            Fondo
        */

    const backgroundGradient = context.createLinearGradient(
      0,
      0,
      canvasWidth,
      canvasHeight,
    );

    backgroundGradient.addColorStop(0, "#172541");

    backgroundGradient.addColorStop(0.48, "#0d101a");

    backgroundGradient.addColorStop(1, "#17112a");

    context.fillStyle = backgroundGradient;

    context.fillRect(0, 0, canvasWidth, canvasHeight);

    /*
            Decoración superior
        */

    const glow = context.createRadialGradient(
      canvasWidth * 0.75,
      40,
      20,
      canvasWidth * 0.75,
      40,
      500,
    );

    glow.addColorStop(0, "rgba(100, 100, 255, 0.28)");

    glow.addColorStop(1, "rgba(100, 100, 255, 0)");

    context.fillStyle = glow;

    context.fillRect(0, 0, canvasWidth, 600);

    /*
            Título
        */

    context.fillStyle = "#ffffff";
    context.textAlign = "left";
    context.textBaseline = "top";

    context.font = "900 64px Arial, sans-serif";

    context.fillText("SPIRIT TRACKER", outerPadding, 48);

    context.fillStyle = "#aeb4c8";

    context.font = "700 28px Arial, sans-serif";

    context.fillText(collectorName, outerPadding, 125);

    /*
            Progreso
        */

    context.fillStyle = "#ffffff";

    context.font = "900 45px Arial, sans-serif";

    context.fillText(`${ownedCount} / ${total}`, outerPadding, 171);

    context.textAlign = "right";

    context.fillText(`${percent}%`, canvasWidth - outerPadding, 171);

    /*
            Barra de progreso
        */

    const progressX = outerPadding;

    const progressY = 232;

    const progressWidth = canvasWidth - outerPadding * 2;

    const progressHeight = 18;

    drawRoundedRectangle(
      context,
      progressX,
      progressY,
      progressWidth,
      progressHeight,
      9,
      "#292e40",
    );

    const filledWidth = progressWidth * (percent / 100);

    if (filledWidth > 0) {
      const progressGradient = context.createLinearGradient(
        progressX,
        progressY,
        progressX + progressWidth,
        progressY,
      );

      progressGradient.addColorStop(0, "#42a5ff");

      progressGradient.addColorStop(1, "#8b5cf6");

      drawRoundedRectangle(
        context,
        progressX,
        progressY,
        filledWidth,
        progressHeight,
        9,
        progressGradient,
      );
    }

    /*
            Cargar todas las imágenes
        */

    const loadedImages = await Promise.all(
      spirits.map((spirit) => loadCanvasImage(spirit.image)),
    );

    /*
            Dibujar miniaturas
        */

    spirits.forEach((spirit, index) => {
      const column = index % columns;

      const row = Math.floor(index / columns);

      const x = outerPadding + column * (cardWidth + cardGap);

      const y = headerHeight + row * (cardHeight + cardGap);

      const isOwned = activeCollection[spirit.id] === true;

      drawSpiritThumbnail(
        context,
        loadedImages[index],
        x,
        y,
        cardWidth,
        cardHeight,
        isOwned,
        spirit.rarity,
      );
    });

    /*
            Descargar
        */

    const blob = await canvasToBlob(canvas);

    const fileName = createImageFileName(collectorName);

    downloadBlob(blob, fileName);

    imageMessage.textContent =
      currentLanguage === "es" ? "✓ Imagen descargada" : "✓ Image downloaded";
  } catch (error) {
    console.error("No se pudo generar la imagen:", error);

    imageMessage.textContent =
      currentLanguage === "es"
        ? "No se pudo generar la imagen"
        : "Image could not be generated";
  } finally {
    downloadImageButton.disabled = false;

    setTimeout(() => {
      imageMessage.textContent = "";
    }, 3500);
  }
}

/* ========================================
DIBUJAR MINIATURA
======================================== */

function drawSpiritThumbnail(
  context,
  image,
  x,
  y,
  width,
  height,
  isOwned,
  rarity,
) {
  const radius = 16;

  /*
        Color del borde según rareza
    */

  const rarityColors = {
    rare: "#2196f3",
    epic: "#a855f7",
    legendary: "#f59e0b",
    mythic: "#ffd700",
  };

  const borderColor = rarityColors[rarity] || "#ffffff";

  context.save();

  /*
        Sombra de la tarjeta
    */

  context.shadowColor = "rgba(0, 0, 0, 0.35)";

  context.shadowBlur = 14;
  context.shadowOffsetY = 6;

  drawRoundedRectangle(context, x, y, width, height, radius, "#171a27");

  context.shadowColor = "transparent";

  /*
        Recorte de imagen
    */

  roundedRectanglePath(context, x, y, width, height, radius);

  context.clip();

  drawContainedImage(context, image, x, y, width, height);

  context.restore();

  /*
        Borde
    */

  context.save();

  roundedRectanglePath(
    context,
    x + 1.5,
    y + 1.5,
    width - 3,
    height - 3,
    radius,
  );

  context.lineWidth = isOwned ? 5 : 3;

  context.strokeStyle = isOwned ? "#22c55e" : borderColor;

  context.stroke();

  context.restore();

  /*
        Palomita
    */

  if (isOwned) {
    const checkX = x + 24;
    const checkY = y + 24;
    const checkRadius = 18;

    context.save();

    context.beginPath();

    context.arc(checkX, checkY, checkRadius, 0, Math.PI * 2);

    context.fillStyle = "#22c55e";

    context.fill();

    context.lineWidth = 3;

    context.strokeStyle = "#ffffff";

    context.stroke();

    context.fillStyle = "#ffffff";

    context.textAlign = "center";

    context.textBaseline = "middle";

    context.font = "900 24px Arial, sans-serif";

    context.fillText("✓", checkX, checkY + 1);

    context.restore();
  }
}

/* ========================================
CARGAR IMAGEN PARA CANVAS
======================================== */

function loadCanvasImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () => reject(new Error(`No se pudo cargar ${source}`));

    image.src = source;
  });
}

/* ========================================
DIBUJAR IMAGEN CONTENIDA
======================================== */

function drawContainedImage(context, image, x, y, width, height) {
  const imageRatio = image.width / image.height;

  const boxRatio = width / height;

  let drawWidth;
  let drawHeight;
  let drawX;
  let drawY;

  if (imageRatio > boxRatio) {
    drawWidth = width;
    drawHeight = width / imageRatio;

    drawX = x;
    drawY = y + (height - drawHeight) / 2;
  } else {
    drawHeight = height;
    drawWidth = height * imageRatio;

    drawX = x + (width - drawWidth) / 2;

    drawY = y;
  }

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

/* ========================================
RECTÁNGULOS REDONDEADOS
======================================== */

function roundedRectanglePath(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();

  context.moveTo(x + safeRadius, y);

  context.lineTo(x + width - safeRadius, y);

  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);

  context.lineTo(x + width, y + height - safeRadius);

  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );

  context.lineTo(x + safeRadius, y + height);

  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);

  context.lineTo(x, y + safeRadius);

  context.quadraticCurveTo(x, y, x + safeRadius, y);

  context.closePath();
}

function drawRoundedRectangle(context, x, y, width, height, radius, fillStyle) {
  context.save();

  roundedRectanglePath(context, x, y, width, height, radius);

  context.fillStyle = fillStyle;

  context.fill();

  context.restore();
}

/* ========================================
DESCARGAR ARCHIVO
======================================== */

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("No se pudo crear el PNG"));
        }
      },
      "image/png",
      1,
    );
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);

  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function createImageFileName(name) {
  const normalizedName = normalizeText(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${normalizedName || "spirit-tracker"}-coleccion.png`;
}

downloadImageButton.addEventListener("click", generateCollectionImage);
/* ========================================
INICIAR
======================================== */

loadSpirits();
