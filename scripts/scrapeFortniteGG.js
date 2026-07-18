const fs = require("node:fs");
const path = require("node:path");

/*
    Rutas del proyecto
*/

const projectRoot = path.resolve(__dirname, "..");

const inputPath = path.join(projectRoot, "data", "fortnitegg-sprites.html");

const outputPath = path.join(projectRoot, "data", "fortnitegg-preview.json");

/*
    Decodificar caracteres HTML
*/

function decodeHtml(value) {
  return String(value ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

/*
    Limpiar etiquetas y espacios
*/

function cleanText(value) {
  return decodeHtml(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
    Detectar variante mediante el nombre
*/

function detectVariant(originalName) {
  const variants = [
    ["Gold ", "gold"],
    ["Gummy ", "gummy"],
    ["Galaxy ", "galaxy"],
    ["Gem ", "gem"],
    ["Holofoil ", "holofoil"],
    ["Cube ", "cube"],
    ["Quack ", "quack"],
  ];

  for (const [prefix, variant] of variants) {
    if (originalName.toLowerCase().startsWith(prefix.toLowerCase())) {
      return {
        variant,
        baseName: originalName
          .slice(prefix.length)
          .replace(/\s+Sprite$/i, "")
          .trim(),
      };
    }
  }

  return {
    variant: "base",
    baseName: originalName.replace(/\s+Sprite$/i, "").trim(),
  };
}

/*
    Crear ID permanente desde la URL
*/

function createStableId(relativeUrl, name, variant) {
  const slug = relativeUrl.split("/").filter(Boolean).at(-1);

  const numericId = slug?.match(/^(\d+)(?:-|$)/)?.[1];

  if (numericId) {
    return `fortnitegg-${numericId}`;
  }

  const normalizedName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${normalizedName}-${variant}`;
}

/*
    Extraer registros del HTML
*/

function extractSpirits(html) {
  const spiritsByUrl = new Map();

  const linkPattern =
    /<a\b[^>]*href=["'](\/sprites\/[^"'?#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const relativeUrl = match[1];
    const linkContent = match[2];

    if (relativeUrl === "/sprites") {
      continue;
    }

    const originalName = cleanText(linkContent);

    if (!originalName || originalName.length > 100) {
      continue;
    }

    const { variant, baseName } = detectVariant(originalName);

    if (!baseName) {
      continue;
    }

    const stableId = createStableId(relativeUrl, baseName, variant);

    spiritsByUrl.set(relativeUrl, {
      id: stableId,
      source: "fortnite.gg",
      sourceUrl: `https://fortnite.gg${relativeUrl}`,
      name: {
        es: baseName,
        en: baseName,
      },
      variant,
      originalName,
    });
  }

  return [...spiritsByUrl.values()];
}

/*
    Programa principal
*/

function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(
      "No se encontró data/fortnitegg-sprites.html. Guarda la página de Fortnite.GG dentro de la carpeta data.",
    );
  }

  console.log("Leyendo la copia local de Fortnite.GG...");

  const html = fs.readFileSync(inputPath, "utf8");

  const spirits = extractSpirits(html);

  if (spirits.length === 0) {
    throw new Error(
      "No se detectaron Sprites. Comprueba que guardaste la página completa o el HTML original.",
    );
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(spirits, null, 4)}\n`, "utf8");

  console.log(`Se detectaron ${spirits.length} registros.`);

  console.log("Archivo generado: data/fortnitegg-preview.json");
}

/*
    Ejecutar
*/

try {
  main();
} catch (error) {
  console.error("Error al procesar los datos:", error.message);

  process.exitCode = 1;
}
