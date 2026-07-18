"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

const currentPath = path.join(projectRoot, "data", "spirits.json");

const previewPath = path.join(projectRoot, "data", "fortnitegg-preview.json");

const reportPath = path.join(projectRoot, "data", "spirits-comparison.json");

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró ${label}: ${filePath}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!Array.isArray(data)) {
    throw new Error(`${label} no contiene una lista válida.`);
  }

  return data;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getName(spirit) {
  let name = "";

  if (typeof spirit?.name === "string") {
    name = spirit.name;
  } else if (spirit?.name && typeof spirit.name === "object") {
    name =
      spirit.name.en || spirit.name.es || Object.values(spirit.name)[0] || "";
  } else {
    name = spirit?.nombre || spirit?.title || "";
  }

  const parenthesisMatch = name.match(/\(([^()]+)\)\s*$/);

  if (parenthesisMatch) {
    name = parenthesisMatch[1];
  }

  return name.replace(/\s+sprite$/i, "").trim();
}

function normalizeVariant(value) {
  let variant = normalizeText(value);

  const parenthesisMatch = variant.match(/\(([^()]+)\)\s*$/);

  if (parenthesisMatch) {
    variant = normalizeText(parenthesisMatch[1]);
  }

  const aliases = {
    base: "base",

    gold: "gold",
    oro: "gold",
    golden: "gold",

    candy: "gummy",
    gummy: "gummy",
    gomita: "gummy",
    gominola: "gummy",

    galaxy: "galaxy",
    galaxia: "galaxy",
    galactic: "galaxy",

    holofoil: "holofoil",
    holografica: "holofoil",
    holografico: "holofoil",
    holographic: "holofoil",
    holo: "holofoil",

    gem: "gem",
    gema: "gem",

    cube: "cube",
    cubo: "cube",

    quack: "quack",
  };

  return aliases[variant] || variant || "base";
}

function removeVariantFromName(name, variant) {
  let normalizedName = normalizeText(name);

  const prefixes = {
    gold: ["gold ", "golden ", "oro "],

    gummy: ["gummy ", "candy ", "gomita ", "gominola "],

    galaxy: ["galaxy ", "galaxia ", "galactic "],

    holofoil: ["holofoil ", "holographic ", "holografica ", "holo "],

    gem: ["gem ", "gema "],

    cube: ["cube ", "cubo "],

    quack: ["quack "],
  };

  for (const prefix of prefixes[variant] || []) {
    if (normalizedName.startsWith(prefix)) {
      normalizedName = normalizedName.slice(prefix.length);

      break;
    }
  }

  return normalizedName.replace(/\s+sprite$/i, "").trim();
}

function createMatchKey(spirit) {
  const variant = normalizeVariant(spirit?.variant);

  const baseName = removeVariantFromName(getName(spirit), variant);

  return `${baseName}|${variant}`;
}

function main() {
  const currentSpirits = readJson(currentPath, "data/spirits.json");

  const previewSpirits = readJson(previewPath, "data/fortnitegg-preview.json");

  const publishedSpirits = previewSpirits.filter(
    (spirit) => spirit.released === true,
  );

  const currentByKey = new Map();

  for (const spirit of currentSpirits) {
    const key = createMatchKey(spirit);

    if (!currentByKey.has(key)) {
      currentByKey.set(key, spirit);
    }
  }

  const sourceByKey = new Map();

  for (const spirit of publishedSpirits) {
    const key = createMatchKey(spirit);

    if (!sourceByKey.has(key)) {
      sourceByKey.set(key, spirit);
    }
  }

  const matched = [];
  const newSpirits = [];
  const missingFromSource = [];

  for (const sourceSpirit of publishedSpirits) {
    const key = createMatchKey(sourceSpirit);

    const currentSpirit = currentByKey.get(key);

    if (currentSpirit) {
      matched.push({
        key,
        current: currentSpirit,
        source: sourceSpirit,
      });
    } else {
      newSpirits.push({
        key,
        ...sourceSpirit,
      });
    }
  }

  for (const currentSpirit of currentSpirits) {
    const key = createMatchKey(currentSpirit);

    if (!sourceByKey.has(key)) {
      missingFromSource.push({
        key,
        ...currentSpirit,
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),

    totals: {
      current: currentSpirits.length,

      sourcePublished: publishedSpirits.length,

      matched: matched.length,

      new: newSpirits.length,

      missingFromSource: missingFromSource.length,
    },

    newSpirits,
    missingFromSource,
    matched,
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 4)}\n`, "utf8");

  console.log(`Actuales: ${currentSpirits.length}`);

  console.log(`Publicados en Fortnite.GG: ${publishedSpirits.length}`);

  console.log(`Coincidencias: ${matched.length}`);

  console.log(`Nuevos: ${newSpirits.length}`);

  console.log(`No encontrados en la fuente: ${missingFromSource.length}`);

  console.log("Reporte creado: data/spirits-comparison.json");

  if (newSpirits.length > 0) {
    console.log("\nSprites nuevos:");

    for (const spirit of newSpirits) {
      console.log(`- ${getName(spirit)} [${normalizeVariant(spirit.variant)}]`);
    }
  }

  if (missingFromSource.length > 0) {
    console.log("\nActuales sin coincidencia:");

    for (const spirit of missingFromSource) {
      console.log(`- ${getName(spirit)} [${normalizeVariant(spirit.variant)}]`);
    }
  }
}

try {
  main();
} catch (error) {
  console.error("Error:", error.message);

  process.exitCode = 1;
}
