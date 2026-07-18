const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

const csvPath = path.join(projectRoot, "data", "espiritus_fortnite.csv");

const outputPath = path.join(projectRoot, "data", "spirits.json");

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeRarity(value) {
  const rarity = normalizeText(value);

  const rarityMap = {
    raro: "rare",
    rare: "rare",
    epico: "epic",
    epic: "epic",
    legendario: "legendary",
    legendary: "legendary",
    mitico: "mythic",
    mythic: "mythic",
  };

  return rarityMap[rarity] || rarity;
}

function normalizeVariant(value) {
  const variant = normalizeText(value);

  const variantMap = {
    base: "base",
    oro: "gold",
    gold: "gold",
    gomita: "gummy",
    gummy: "gummy",
    galaxia: "galaxy",
    galaxy: "galaxy",
    holofoil: "holofoil",
    gema: "gem",
    gem: "gem",
    cubo: "cube",
    cube: "cube",
    quack: "quack",
  };

  return variantMap[variant] || variant;
}

function parsePrice(value) {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));

  return Number.isFinite(number) ? number : 0;
}

function createStableId(name, variant) {
  const normalizedName = normalizeText(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${normalizedName}-${variant}`;
}

function parseCSV(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    throw new Error("El CSV no contiene registros.");
  }

  const headers = lines[0].split(",").map((header) => header.trim());

  return lines.slice(1).map((line, index) => {
    const values = line.split(",").map((value) => value.trim());

    const record = {};

    headers.forEach((header, columnIndex) => {
      record[header] = values[columnIndex] ?? "";
    });

    const imageNumber = index + 1;
    const name = record.Nombre;
    const variant = normalizeVariant(record.Variante);

    return {
      id: createStableId(name, variant),
      legacyId: imageNumber,
      name: {
        es: name,
        en: name,
      },
      rarity: normalizeRarity(record.Rareza),
      variant,
      price: parsePrice(record["Coste de Polvo"]),
      released: true,
      image: `assets/spirits/${String(imageNumber).padStart(3, "0")}.webp`,
    };
  });
}

function main() {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`No se encontró el CSV: ${csvPath}`);
  }

  const csvText = fs.readFileSync(csvPath, "utf8");
  const spirits = parseCSV(csvText);

  fs.writeFileSync(outputPath, `${JSON.stringify(spirits, null, 4)}\n`, "utf8");

  console.log(`Se generaron ${spirits.length} espíritus en data/spirits.json`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
