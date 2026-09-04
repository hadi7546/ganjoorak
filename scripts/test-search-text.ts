import assert from "node:assert/strict";
import {
  findNormalizedMatchRange,
  getVerseSnippet,
  normalizeSearchText,
  parseSearchIntent,
} from "../src/utils/searchText.ts";

const hafez = {
  id: 2,
  name: "خواجه شمس‌الدین محمد حافظ شیرازی",
  nickname: "حافظ",
  urlSlug: "hafez",
  source: "ganjoor" as const,
  published: true,
};

const saadi = {
  id: 3,
  name: "سعدی شیرازی",
  nickname: "سعدی",
  urlSlug: "saadi",
  source: "ganjoor" as const,
  published: true,
};

const poets = [hafez, saadi];

assert.equal(normalizeSearchText("  رُخِ يار  "), "رخ یار");
assert.equal(normalizeSearchText("می‌شود"), "میشود");
assert.equal(normalizeSearchText("۱۲۳"), "123");
assert.equal(normalizeSearchText("كتاب"), "کتاب");

const loveIntent = parseSearchIntent("درمورد عشق", poets);
assert.equal(loveIntent.term, "عشق");
assert.equal(loveIntent.poetId, null);

const hafezIntent = parseSearchIntent("شعر حافظ درمورد عشق", poets);
assert.equal(hafezIntent.term, "عشق");
assert.equal(hafezIntent.poetId, 2);
assert.equal(hafezIntent.poet?.urlSlug, "hafez");

const verseIntent = parseSearchIntent("رخ یار", poets);
assert.equal(verseIntent.term, "رخ یار");
assert.equal(verseIntent.poetId, null);

const aboutIntent = parseSearchIntent("دربارهٔ آزادی", poets);
assert.equal(aboutIntent.term, "ازادی");

const snippet = getVerseSnippet(
  "اگر آن ترک شیرازی به دست آرد دل ما را\nبه خال هندویش بخشم سمرقند و بخارا را\nبده ساقی می باقی",
  "خال هندو",
);
assert.equal(snippet.matchLine.includes("خال"), true);
assert.equal(snippet.contextPosition, "after");
assert.ok(snippet.highlight);
assert.equal(
  snippet.matchLine.slice(snippet.highlight!.start, snippet.highlight!.end).includes("خال"),
  true,
);

const range = findNormalizedMatchRange("رخِ يار در نظر است", "رخ یار");
assert.ok(range);
assert.equal("رخِ يار در نظر است".slice(range!.start, range!.end).includes("رخ"), true);

console.log("searchText tests passed");
