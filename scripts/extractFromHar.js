"use strict";

const fs = require("node:fs");
const path = require("node:path");
const cheerio = require("cheerio");

const projectRoot = path.resolve(__dirname, "..");

const harPath = path.join(projectRoot, "data", "fortnite.gg.har");

const outputPath = path.join(projectRoot, "data", "fortnitegg-preview.json");

function readHarHtml() {
  if (!fs.existsSync(harPath)) {
    throw new Error("No se encontró data/fortnite.gg.har");
  }

  const har = JSON.parse(fs.readFileSync(harPath, "utf8"));

  const entries = har?.log?.entries ?? [];

  const pageEntry = entries.find((entry) => {
    const url = entry?.request?.url ?? "";

    return (
      url === "https://fortnite.gg/sprites" && entry?.response?.status === 200
    );
  });

  if (!pageEntry) {
    throw new Error(
      "No se encontró la respuesta HTML de /sprites dentro del HAR.",
    );
  }

  const content = pageEntry.response?.content ?? {};

  if (!content.text) {
    throw new Error("La respuesta /sprites no contiene HTML guardado.");
  }

  if (content.encoding === "base64") {
    return Buffer.from(content.text, "base64").toString("utf8");
  }

  return content.text;
}

function getVariant(card) {
  const variant = card.attr("data-variant")?.trim();

  return variant || "base";
}

function getRarity(card) {
  const rarity = card.attr("data-rarity")?.trim();

  return rarity || "unknown";
}

function getImageUrl(card) {
  const source = card.find(".sprite-art img").attr("src");

  if (!source) {
    return "";
  }

  return new URL(source, "https://fortnite.gg").toString();
}

function extractSpirits(html) {
  const $ = cheerio.load(html);

  const spirits = [];

  $(".sprite-card").each((_, element) => {
    const card = $(element);

    const sourceId = card.attr("data-sprite")?.trim();

    const name = card
      .find(".sprite-name")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    if (!sourceId || !name) {
      return;
    }

    const rarity = getRarity(card);

    const variant = getVariant(card);

    const detailPath = card.find(".sprite-name").attr("href") || "";

    const percentageText = card
      .find(".sprite-meta .sprite-pill")
      .last()
      .text()
      .trim();

    const dropChance = Number.parseFloat(percentageText.replace("%", ""));

    const unreleased = card.find(".sprite-unreleased-badge").length > 0;

    spirits.push({
      id: `fortnitegg-${sourceId}`,
      sourceId: Number(sourceId),
      source: "fortnite.gg",
      sourceUrl: detailPath
        ? new URL(detailPath, "https://fortnite.gg").toString()
        : "",
      name: {
        es: name,
        en: name,
      },
      rarity,
      variant,
      price: 0,
      released: !unreleased,
      dropChance: Number.isFinite(dropChance) ? dropChance : null,
      remoteImage: getImageUrl(card),
    });
  });

  return spirits.sort((a, b) => a.sourceId - b.sourceId);
}

function main() {
  console.log("Leyendo fortnite.gg.har...");

  const html = readHarHtml();

  const spirits = extractSpirits(html);

  if (spirits.length === 0) {
    throw new Error("No se encontraron tarjetas .sprite-card.");
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(spirits, null, 4)}\n`, "utf8");

  console.log(`Se detectaron ${spirits.length} registros.`);

  console.log("Archivo creado: data/fortnitegg-preview.json");

  const released = spirits.filter((spirit) => spirit.released).length;

  const unreleased = spirits.length - released;

  console.log(`Publicados: ${released}`);

  console.log(`No publicados: ${unreleased}`);
}

try {
  main();
} catch (error) {
  console.error("Error:", error.message);

  process.exitCode = 1;
}
