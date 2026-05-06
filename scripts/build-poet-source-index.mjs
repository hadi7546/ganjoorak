import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const GANJOOR_API_BASE_URL = (
  process.env.GANJOOR_API_BASE_URL ||
  process.env.NEXT_PUBLIC_GANJOOR_API_BASE_URL ||
  "http://api.offline.ganjoor.net"
).replace(/\/+$/, "");

const ECHOLALIA_API_BASE_URL = "https://echolalia.ir/wp-json/wp/v2";
const ECHOLALIA_POET_ROOT_SLUG = "sher";
const OUTPUT_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "poet-source-index.json",
);

const decodeWordPressSlug = (slug) => {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
};

const getGanjoorSlug = (fullUrl) =>
  String(fullUrl || "")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)[0] || "";

const fetchJson = async (url, params) => {
  const requestUrl = new URL(url);
  Object.entries(params || {}).forEach(([key, value]) => {
    requestUrl.searchParams.set(key, String(value));
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(requestUrl, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return {
      data: await response.json(),
      headers: response.headers,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const readExistingIndex = async () => {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  } catch {
    return {
      generatedAt: null,
      sourcesBySlug: {},
    };
  }
};

const addEntry = (entries, slug, entry) => {
  if (!slug) return;
  if (entries[slug]?.source === "ganjoor") return;
  entries[slug] = entry;
};

const loadGanjoorPoets = async (entries) => {
  const response = await fetchJson(`${GANJOOR_API_BASE_URL}/api/ganjoor/poets`);
  const poets = Array.isArray(response.data) ? response.data : [];

  poets.forEach((poet) => {
    const slug = getGanjoorSlug(poet.fullUrl);
    addEntry(entries, slug, {
      source: "ganjoor",
      id: poet.id ?? null,
      name: poet.name ?? "",
    });
  });

  return poets.length;
};

const loadEcholaliaPoets = async (entries) => {
  const rootResponse = await fetchJson(`${ECHOLALIA_API_BASE_URL}/categories`, {
    slug: ECHOLALIA_POET_ROOT_SLUG,
    _fields: "id,name,slug,count,parent,link,description",
  });
  const rootCategory = rootResponse.data?.[0];

  if (!rootCategory) {
    return 0;
  }

  const firstPageResponse = await fetchJson(`${ECHOLALIA_API_BASE_URL}/categories`, {
    per_page: 100,
    page: 1,
    _fields: "id,name,slug,count,parent,link,description",
  });
  const totalPages = Number(firstPageResponse.headers.get("x-wp-totalpages") ?? 1);
  const pageResponses = [firstPageResponse];

  for (let page = 2; page <= totalPages; page += 1) {
    pageResponses.push(
      await fetchJson(`${ECHOLALIA_API_BASE_URL}/categories`, {
        per_page: 100,
        page,
        _fields: "id,name,slug,count,parent,link,description",
      }),
    );
  }

  const categories = pageResponses.flatMap((response) =>
    Array.isArray(response.data) ? response.data : [],
  );
  const childrenByParent = new Map();

  categories.forEach((category) => {
    const siblings = childrenByParent.get(category.parent) ?? [];
    siblings.push(category);
    childrenByParent.set(category.parent, siblings);
  });

  const descendantIds = new Set();
  const collectDescendants = (parentId) => {
    (childrenByParent.get(parentId) ?? []).forEach((child) => {
      descendantIds.add(child.id);
      collectDescendants(child.id);
    });
  };
  collectDescendants(rootCategory.id);

  const leafPoets = categories
    .filter((category) => descendantIds.has(category.id))
    .filter((category) => category.count > 0)
    .filter((category) => (childrenByParent.get(category.id) ?? []).length === 0);

  leafPoets.forEach((category) => {
    const slug = decodeWordPressSlug(category.slug);
    const parent = categories.find((item) => item.id === category.parent);
    addEntry(entries, slug, {
      source: "echolalia",
      id: category.id ?? null,
      name: category.name ?? "",
      sourceGroupName: parent?.name ?? null,
    });
  });

  return leafPoets.length;
};

const main = async () => {
  const existing = await readExistingIndex();
  const entries = { ...(existing.sourcesBySlug ?? {}) };

  try {
    const [ganjoorCount, echolaliaCount] = await Promise.all([
      loadGanjoorPoets(entries),
      loadEcholaliaPoets(entries),
    ]);
    const sortedEntries = Object.fromEntries(
      Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)),
    );

    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(
      OUTPUT_PATH,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          sourcesBySlug: sortedEntries,
        },
        null,
        2,
      )}\n`,
    );

    console.log(
      `Built poet source index: ${ganjoorCount} Ganjoor poets, ${echolaliaCount} Echolalia poets`,
    );
  } catch (error) {
    console.warn("Could not refresh poet source index; keeping existing file.");
    console.warn(error instanceof Error ? error.message : error);
  }
};

await main();
