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


/* ========================================
ESTADO DE LA APLICACIÓN
======================================== */

let spirits = [];

let currentLanguage =
localStorage.getItem("spiritTrackerLanguage") || "es";

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
        base: "Base",
        gold: "Oro",
        gummy: "Gomita",
        galaxy: "Galaxia",
        holofoil: "Holofoil",
        gem: "Gema"
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
        base: "Base",
        gold: "Gold",
        gummy: "Gummy",
        galaxy: "Galaxy",
        holofoil: "Holofoil",
        gem: "Gem"
    }

};


    /* ========================================
    CARGAR CSV
    ======================================== */

async function loadSpirits() {

    try {

        const response = await fetch(
            "data/espiritus_fortnite.csv"
        );

        if (!response.ok) {
            throw new Error(
                `No se pudo cargar el CSV: ${response.status}`
            );
        }

        const csvText = await response.text();

        spirits = parseCSV(csvText);

        /*
    Si la URL contiene ?c=...
    cargamos esa colección.
*/

        loadSharedCollection();

        updateLanguage();
        render();

    } catch (error) {

        console.error(error);

        grid.innerHTML = `
            <p class="load-error">
                No se pudo cargar el archivo de espíritus.
                Revisa la consola para ver el error.
            </p>
        `;

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

    const headers = rows[0].map(header =>
        header.trim()
    );

    return rows
        .slice(1)
        .filter(row =>
            row.some(cell => cell.trim() !== "")
        )
        .map((row, index) => {

            const record = {};

            headers.forEach((header, columnIndex) => {
                record[header] =
                    row[columnIndex]?.trim() || "";
            });

            const names = separateNames(record.Nombre);

            const id = index + 1;

            return {
                id,
                name: names,
                rarity: normalizeRarity(record.Rareza),
                variant: normalizeVariant(record.Variante),
                price: parsePrice(record["Coste de Polvo"]),
                image:
                    `assets/spirits/${String(id).padStart(3, "0")}.webp`
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

        if (
            character === '"' &&
            insideQuotes &&
            nextCharacter === '"'
        ) {
            cell += '"';
            i++;
            continue;
        }

        if (character === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (
            character === "," &&
            !insideQuotes
        ) {
            row.push(cell);
            cell = "";
            continue;
        }

        if (
            (character === "\n" ||
             character === "\r") &&
            !insideQuotes
        ) {

            if (
                character === "\r" &&
                nextCharacter === "\n"
            ) {
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

    const match = fullName.match(
        /^(.*?)\s*\(([^()]*)\)\s*$/
    );

    if (!match) {

        return {
            es: fullName.trim(),
            en: fullName.trim()
        };

    }

    return {
        es: match[1].trim(),
        en: match[2].trim()
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
        mythic: "mythic"
    };

    return rarityMap[value] || value;

}


function normalizeVariant(variant) {

    const value = normalizeText(variant);

    if (value.includes("oro") ||
        value.includes("gold")) {
        return "gold";
    }

    if (value.includes("gomita") ||
        value.includes("gummy")) {
        return "gummy";
    }

    if (value.includes("galaxia") ||
        value.includes("galaxy")) {
        return "galaxy";
    }

    if (value.includes("holografica") ||
        value.includes("holofoil")) {
        return "holofoil";
    }

    if (value.includes("gema") ||
        value.includes("gem")) {
        return "gem";
    }

    return "base";

}


function parsePrice(price) {

    const number = Number(
        String(price).replace(/[^\d.-]/g, "")
    );

    return Number.isFinite(number) ? number : 0;

}


/* ========================================
   COLECCIÓN GUARDADA
======================================== */

function loadCollection() {

    try {

        const storedCollection =
            localStorage.getItem(
                "spiritTrackerCollection"
            );

        return storedCollection
            ? JSON.parse(storedCollection)
            : {};

    } catch (error) {

        console.error(
            "No se pudo leer la colección guardada:",
            error
        );

        return {};

    }

}


function saveCollection() {

    localStorage.setItem(
        "spiritTrackerCollection",
        JSON.stringify(collection)
    );

}


/* ========================================
   FILTRAR ESPÍRITUS
======================================== */

function getFilteredSpirits() {

    const activeCollection = getActiveCollection();
    const normalizedSearch =
        normalizeText(currentSearch);

    return spirits.filter(spirit => {

        const isOwned = activeCollection[spirit.id] === true;

        const nameMatches =
            normalizeText(spirit.name.es)
                .includes(normalizedSearch) ||
            normalizeText(spirit.name.en)
                .includes(normalizedSearch);

        const collectionMatches =
            currentCollectionFilter === "all" ||
            (
                currentCollectionFilter === "owned" &&
                isOwned
            ) ||
            (
                currentCollectionFilter === "missing" &&
                !isOwned
            );

        const rarityMatches =
            currentRarityFilter === "all" ||
            spirit.rarity === currentRarityFilter;

        const variantMatches =
            currentVariantFilter === "all" ||
            spirit.variant === currentVariantFilter;

        return (
            nameMatches &&
            collectionMatches &&
            rarityMatches &&
            variantMatches
        );

    });

}


/* ========================================
   MOSTRAR TARJETAS
======================================== */

function render() {

    grid.innerHTML = "";

    const filteredSpirits = getFilteredSpirits();
        const activeCollection = getActiveCollection();

    filteredSpirits.forEach(spirit => {

        const isOwned = activeCollection[spirit.id] === true;

        const card = document.createElement("article");

        card.className =
            `card ${spirit.rarity} ${spirit.variant}`;

        if (isOwned) {
            card.classList.add("owned");
        }

        const translatedRarity =
            getRarityLabel(spirit.rarity);

        const translatedVariant =
            getVariantLabel(spirit.variant);

        card.innerHTML = `
            <img
                class="card-image"
                src="${spirit.image}"
                alt="${escapeHTML(spirit.name[currentLanguage])}"
                loading="lazy"
            >

            <div class="card-content">

                <h3 class="card-title">
                    ${escapeHTML(spirit.name[currentLanguage])}
                </h3>

                <div class="card-meta">

                    <span class="badge rarity-badge">
                        ${translatedRarity}
                    </span>

                    <span class="badge variant-badge">
                        ${getVariantIcon(spirit.variant)}
                        ${translatedVariant}
                    </span>

                    <span class="badge price-badge">
                        ${formatNumber(spirit.price)}
                    </span>

                </div>

                <label class="card-owned">

                    <input
                        type="checkbox"
                        data-id="${spirit.id}"
                        ${isOwned ? "checked" : ""}
                        ${isSharedMode ? "disabled" : ""}
                    >

                    <span>
                        ${translations[currentLanguage].owned}
                    </span>

                </label>

            </div>
        `;

        grid.appendChild(card);

    });

    noResults.hidden =
        filteredSpirits.length !== 0;

    updateStatistics();
    addCheckboxEvents();

}


/* ========================================
    CHECKBOXES
======================================== */

function addCheckboxEvents() {
if (isSharedMode) {
    return;
}

const checkboxes = grid.querySelectorAll("input[type='checkbox'][data-id]");

checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
    const id = Number(event.target.dataset.id);

    collection[id] = event.target.checked;

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

    const ownedCount =
        ownedSpirits.length;

    const total =
        spirits.length;

    const completedPercentage =
        total > 0
            ? Math.round(
                (ownedCount / total) * 100
            )
            : 0;

    const totalDust =
        ownedSpirits.reduce(
            (sum, spirit) =>
                sum + spirit.price,
            0
        );

    counter.textContent =
        `${ownedCount} / ${total}`;

    percentage.textContent =
        `${completedPercentage}%`;

    progressBar.style.width =
        `${completedPercentage}%`;

    dustValue.textContent =
        formatNumber(totalDust);

}


/* ========================================
   BOTONES DE FILTRO
======================================== */

document
    .querySelectorAll("[data-collection]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentCollectionFilter =
                    button.dataset.collection;

                setActiveButton(
                    "[data-collection]",
                    button
                );

                render();

            }
        );

    });


document
    .querySelectorAll("[data-rarity]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentRarityFilter =
                    button.dataset.rarity;

                setActiveButton(
                    "[data-rarity]",
                    button
                );

                render();

            }
        );

    });


document
    .querySelectorAll("[data-variant]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentVariantFilter =
                    button.dataset.variant;

                setActiveButton(
                    "[data-variant]",
                    button
                );

                render();

            }
        );

    });


function setActiveButton(
    selector,
    activeButton
) {

    document
        .querySelectorAll(selector)
        .forEach(button => {
            button.classList.remove("active");
        });

    activeButton.classList.add("active");

}


/* ========================================
   BUSCADOR
======================================== */

searchInput.addEventListener(
    "input",
    event => {

        currentSearch =
            event.target.value;

        render();

    }
);


/* ========================================
   IDIOMA
======================================== */

languageButton.addEventListener(
    "click",
    () => {

        currentLanguage =
            currentLanguage === "es"
                ? "en"
                : "es";

        localStorage.setItem(
            "spiritTrackerLanguage",
            currentLanguage
        );

        updateLanguage();
        render();

    }
);


function updateLanguage() {

    const text =
        translations[currentLanguage];

    document.documentElement.lang =
        currentLanguage;

    languageButton.textContent =
        currentLanguage === "es"
            ? "EN"
            : "ES";

    subtitle.textContent =
        text.subtitle;

    progressLabel.textContent =
        text.completed;

    collectionLabel.textContent =
        text.collection;

    dustLabel.textContent =
        text.dust;

    rarityTitle.textContent =
        text.rarity;

    variantTitle.textContent =
        text.variant;

    searchInput.placeholder =
        text.search;

    noResults.textContent =
        text.noResults;

    updateFilterTexts();

    if (currentLanguage === "es") {
    sharedTitle.textContent = "Estás viendo la colección de otra persona";

    sharedDescription.textContent =
        "Tu colección personal permanece guardada.";

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

    const isSpanish =
        currentLanguage === "es";

    const collectionTexts =
        isSpanish
            ? ["Todos", "Tengo", "Me faltan"]
            : ["All", "Owned", "Missing"];

    document
        .querySelectorAll("[data-collection]")
        .forEach((button, index) => {
            button.textContent =
                collectionTexts[index];
        });

    const rarityTexts = {
        all: isSpanish ? "Todas" : "All",
        rare: isSpanish ? "Raro" : "Rare",
        epic: isSpanish ? "Épico" : "Epic",
        legendary:
            isSpanish
                ? "Legendario"
                : "Legendary",
        mythic:
            isSpanish
                ? "Mítico"
                : "Mythic"
    };

    document
        .querySelectorAll("[data-rarity]")
        .forEach(button => {

            button.textContent =
                rarityTexts[
                    button.dataset.rarity
                ];

        });

    const variantTexts = {
        all: isSpanish ? "Todas" : "All",
        base: "Base",
        gold: isSpanish ? "Oro" : "Gold",
        gummy:
            `🍉 ${
                isSpanish
                    ? "Gomita"
                    : "Gummy"
            }`,
        galaxy:
            `🌌 ${
                isSpanish
                    ? "Galaxia"
                    : "Galaxy"
            }`,
        holofoil: "✨ Holofoil",
        gem:
            `💎 ${
                isSpanish
                    ? "Gema"
                    : "Gem"
            }`
    };

    document
        .querySelectorAll("[data-variant]")
        .forEach(button => {

            button.textContent =
                variantTexts[
                    button.dataset.variant
                ];

        });

}


/* ========================================
   ETIQUETAS
======================================== */

function getRarityLabel(rarity) {

    const text =
        translations[currentLanguage];

    const labels = {
        rare: text.rare,
        epic: text.epic,
        legendary: text.legendary,
        mythic: text.mythic
    };

    return labels[rarity] || rarity;

}


function getVariantLabel(variant) {

    const text =
        translations[currentLanguage];

    const labels = {
        base: text.base,
        gold: text.gold,
        gummy: text.gummy,
        galaxy: text.galaxy,
        holofoil: text.holofoil,
        gem: text.gem
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
        gem: "💎"
    };

    return icons[variant] || "";

}


/* ========================================
   UTILIDADES
======================================== */

function formatNumber(number) {

    return new Intl.NumberFormat(
        currentLanguage === "es"
            ? "es-MX"
            : "en-US"
    ).format(number);

}


function escapeHTML(text) {

    const element =
        document.createElement("div");

    element.textContent =
        String(text);

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
        .map(spirit =>
            collection[spirit.id] === true
                ? "1"
                : "0"
        )
        .join("");

    /*
        Convertimos grupos de bits
        en caracteres hexadecimales.

        1111 → f
        1010 → a

        Esto hace la URL más corta.
    */

    let encoded = "";

    for (
        let i = 0;
        i < bits.length;
        i += 4
    ) {

        const group =
            bits
                .slice(i, i + 4)
                .padEnd(4, "0");

        encoded +=
            parseInt(group, 2)
                .toString(16);

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

        bits +=
            parseInt(character, 16)
                .toString(2)
                .padStart(4, "0");

    }

    const decodedCollection = {};

    spirits.forEach((spirit, index) => {

        decodedCollection[spirit.id] =
            bits[index] === "1";

    });

    return decodedCollection;

}


function createShareURL() {

    const encodedCollection =
        encodeCollection();

    const url =
        new URL(window.location.href);

    url.searchParams.set(
        "c",
        encodedCollection
    );

    /*
        Eliminamos cualquier fragmento
        que pudiera tener la URL.
    */

    url.hash = "";

    return url.toString();

}


async function copyShareURL() {

    const shareURL =
        createShareURL();

    try {

        await navigator.clipboard.writeText(
            shareURL
        );

        showShareMessage(
            currentLanguage === "es"
                ? "✓ Enlace copiado"
                : "✓ Link copied"
        );

    } catch (error) {

        console.error(
            "No se pudo copiar el enlace:",
            error
        );

        /*
            Alternativa para navegadores
            donde Clipboard API falle.
        */

        window.prompt(
            currentLanguage === "es"
                ? "Copia este enlace:"
                : "Copy this link:",
            shareURL
        );

    }

}


function showShareMessage(message) {

    shareMessage.textContent =
        message;

    clearTimeout(
        showShareMessage.timeout
    );

    showShareMessage.timeout =
        setTimeout(() => {

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


shareButton.addEventListener(
    "click",
    copyShareURL
);

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

    spirits.forEach(spirit => {

        const mine =
            collection[spirit.id] === true;

        const shared =
            sharedCollection[spirit.id] === true;

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

    const confirmed =
        window.confirm(message);

    if (!confirmed) {
        return;
    }

    collection = {
        ...sharedCollection
    };

    saveCollection();
    leaveSharedMode();

    showShareMessage(
        currentLanguage === "es"
            ? "✓ Colección importada"
            : "✓ Collection imported"
    );

}


function leaveSharedMode() {

    isSharedMode = false;
    sharedCollection = null;

    document.body.classList.remove(
        "shared-mode"
    );

    sharedPanel.hidden = true;
    comparisonResults.hidden = true;

    const url =
        new URL(window.location.href);

    url.searchParams.delete("c");

    window.history.replaceState(
        {},
        "",
        url
    );

    render();

}


compareButton.addEventListener(
    "click",
    compareCollections
);

importButton.addEventListener(
    "click",
    importSharedCollection
);

myCollectionButton.addEventListener(
    "click",
    leaveSharedMode
);
/* ========================================
INICIAR
======================================== */

loadSpirits();