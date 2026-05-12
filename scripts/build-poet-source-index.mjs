import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const GANJOOR_API_BASE_URL = (
  process.env.GANJOOR_API_BASE_URL ||
  process.env.NEXT_PUBLIC_GANJOOR_API_BASE_URL ||
  "http://api.offline.ganjoor.net"
).replace(/\/+$/, "");

const ECHOLALIA_API_BASE_URL = "https://echolalia.ir/wp-json/wp/v2";
const ECHOLALIA_POET_ROOT_SLUG = "sher";
const HIDDEN_ECHOLALIA_POET_SLUGS = new Set(["forough-farrokhzad"]);
const OUTPUT_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "poet-source-index.json",
);
const POET_IMAGE_OUTPUT_DIR = path.join(process.cwd(), "public", "images", "poets");
const POET_IMAGE_ROUTE_PREFIX = "/images/poets";
const IMAGE_DOWNLOAD_CONCURRENCY = Number(
  process.env.POET_IMAGE_DOWNLOAD_CONCURRENCY || 8,
);
const IMAGE_DOWNLOAD_LIMIT = Number(process.env.POET_IMAGE_DOWNLOAD_LIMIT || 0);
const SHOULD_DOWNLOAD_POET_IMAGES =
  process.env.SKIP_POET_IMAGE_DOWNLOAD !== "1" &&
  process.env.DOWNLOAD_POET_IMAGES !== "0";
const IMAGE_EXTENSIONS = ["gif", "jpg", "jpeg", "png", "webp"];

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

const fetchText = async (url, params) => {
  const requestUrl = new URL(url);
  Object.entries(params || {}).forEach(([key, value]) => {
    requestUrl.searchParams.set(key, String(value));
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(requestUrl, {
      headers: {
        Accept: "text/html,*/*",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.text();
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
  if (entries[slug]?.source === "ganjoor" && entry.source !== "ganjoor") return;
  entries[slug] = {
    ...(entries[slug] ?? {}),
    ...entry,
    localImageUrl: entries[slug]?.localImageUrl ?? entry.localImageUrl,
  };
};

const safeImageSlug = (slug) =>
  /^[a-z0-9-]+$/i.test(slug)
    ? slug
    : `u-${Buffer.from(slug, "utf8").toString("base64url")}`;

const getLocalImageRoute = (source, slug, extension) =>
  `${POET_IMAGE_ROUTE_PREFIX}/${source}-${safeImageSlug(slug)}.${extension}`;

const getLocalImagePath = (source, slug, extension) =>
  path.join(POET_IMAGE_OUTPUT_DIR, `${source}-${safeImageSlug(slug)}.${extension}`);

const findExistingLocalImageRoute = async (source, slug) => {
  for (const extension of IMAGE_EXTENSIONS) {
    const imagePath = getLocalImagePath(source, slug, extension);
    try {
      await access(imagePath);
      return getLocalImageRoute(source, slug, extension);
    } catch {
      // Try the next supported extension.
    }
  }

  return null;
};

const getImageExtension = (url, contentType) => {
  const normalizedContentType = String(contentType || "").toLowerCase();
  if (normalizedContentType.includes("gif")) return "gif";
  if (normalizedContentType.includes("png")) return "png";
  if (normalizedContentType.includes("webp")) return "webp";
  if (normalizedContentType.includes("jpeg") || normalizedContentType.includes("jpg")) {
    return "jpg";
  }

  const pathname = new URL(url).pathname.toLowerCase();
  const match = pathname.match(/\.([a-z0-9]+)$/);
  const extension = match?.[1] === "jpeg" ? "jpg" : match?.[1];
  return IMAGE_EXTENSIONS.includes(extension) ? extension : "jpg";
};

const downloadImage = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      throw new Error(`Unexpected content type: ${contentType || "unknown"}`);
    }

    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      extension: getImageExtension(response.url || url, contentType),
    };
  } finally {
    clearTimeout(timeout);
  }
};

const extractMetaContent = (html, property) => {
  const metaTagPattern = /<meta\s+[^>]*>/gi;
  const attributePattern = /([\w:-]+)=["']([^"']*)["']/gi;
  const tags = html.match(metaTagPattern) ?? [];

  for (const tag of tags) {
    const attributes = {};
    let attributeMatch;
    attributePattern.lastIndex = 0;

    while ((attributeMatch = attributePattern.exec(tag)) !== null) {
      attributes[attributeMatch[1].toLowerCase()] = attributeMatch[2];
    }

    if (
      attributes.name?.toLowerCase() === property.toLowerCase() ||
      attributes.property?.toLowerCase() === property.toLowerCase()
    ) {
      return attributes.content?.trim() || "";
    }
  }

  return "";
};

const getMediaImageUrl = (media) => {
  const sizes = media?.media_details?.sizes;
  const preferred =
    sizes?.detail?.source_url ||
    sizes?.thumbnail?.source_url ||
    sizes?.["post-image"]?.source_url;

  if (preferred) return preferred;

  if (sizes && typeof sizes === "object") {
    const firstSize = Object.values(sizes).find(
      (size) => typeof size?.source_url === "string" && size.source_url,
    );

    if (firstSize?.source_url) return firstSize.source_url;
  }

  return media?.source_url || null;
};

const getEcholaliaPoetImageUrl = async (categoryId) => {
  const postsResponse = await fetchJson(`${ECHOLALIA_API_BASE_URL}/posts`, {
    categories: categoryId,
    per_page: 1,
    page: 1,
    _fields: "id,link,featured_media",
  });
  const post = Array.isArray(postsResponse.data) ? postsResponse.data[0] : null;

  if (!post) {
    return null;
  }

  if (post.featured_media) {
    try {
      const mediaResponse = await fetchJson(
        `${ECHOLALIA_API_BASE_URL}/media/${post.featured_media}`,
        {
          _fields:
            "source_url,media_details.sizes.thumbnail.source_url,media_details.sizes.post-image.source_url,media_details.sizes.detail.source_url",
        },
      );
      const mediaUrl = getMediaImageUrl(mediaResponse.data);
      if (mediaUrl) return mediaUrl;
    } catch {
      // Some Echolalia media endpoints are private; fall through to page metadata.
    }
  }

  if (post.link) {
    try {
      const postHtml = await fetchText(post.link);
      return (
        extractMetaContent(postHtml, "og:image") ||
        extractMetaContent(postHtml, "twitter:image") ||
        null
      );
    } catch {
      return null;
    }
  }

  return null;
};

const getRemotePoetImageUrl = async (slug, entry) => {
  if (entry.source === "ganjoor") {
    return `${GANJOOR_API_BASE_URL}/api/ganjoor/poet/image/${slug}.gif`;
  }

  if (entry.source === "echolalia" && Number.isInteger(entry.id)) {
    return getEcholaliaPoetImageUrl(entry.id);
  }

  return null;
};

const downloadPoetImage = async (slug, entry) => {
  const existing = await findExistingLocalImageRoute(entry.source, slug);
  if (existing) {
    entry.localImageUrl = existing;
    return true;
  }

  const remoteUrl = await getRemotePoetImageUrl(slug, entry);
  if (!remoteUrl) {
    return false;
  }

  const image = await downloadImage(remoteUrl);
  await mkdir(POET_IMAGE_OUTPUT_DIR, { recursive: true });
  await writeFile(getLocalImagePath(entry.source, slug, image.extension), image.bytes);
  entry.localImageUrl = getLocalImageRoute(entry.source, slug, image.extension);
  return true;
};

const runWithConcurrency = async (items, concurrency, worker) => {
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, async () => {
      while (cursor < items.length) {
        const item = items[cursor];
        cursor += 1;
        await worker(item);
      }
    }),
  );
};

const hydratePoetImages = async (entries) => {
  if (!SHOULD_DOWNLOAD_POET_IMAGES) {
    return { downloaded: 0, failed: 0, skipped: Object.keys(entries).length };
  }

  const allItems = Object.entries(entries).filter(
    ([, entry]) => entry?.source === "ganjoor" || entry?.source === "echolalia",
  );
  const items = IMAGE_DOWNLOAD_LIMIT > 0 ? allItems.slice(0, IMAGE_DOWNLOAD_LIMIT) : allItems;
  let downloaded = 0;
  let failed = 0;

  await runWithConcurrency(items, IMAGE_DOWNLOAD_CONCURRENCY, async ([slug, entry]) => {
    try {
      if (await downloadPoetImage(slug, entry)) {
        downloaded += 1;
      }
    } catch (error) {
      failed += 1;
      console.warn(
        `Could not download poet image for ${entry.source}:${slug}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  });

  return { downloaded, failed, skipped: allItems.length - items.length };
};

const loadGanjoorPoets = async (entries) => {
  const centuriesResponse = await fetchJson(
    `${GANJOOR_API_BASE_URL}/api/ganjoor/centuries`,
  );
  const centuries = Array.isArray(centuriesResponse.data)
    ? centuriesResponse.data
    : [];
  let poetCount = 0;

  centuries
    .filter((century) => Number(century?.id) !== 0)
    .forEach((century) => {
      const poets = Array.isArray(century?.poets) ? century.poets : [];

      poets.forEach((poet) => {
        const slug = getGanjoorSlug(poet.fullUrl);
        addEntry(entries, slug, {
          source: "ganjoor",
          id: poet.id ?? null,
          name: poet.name ?? "",
          centuryId: century.id ?? null,
          centuryName: century.name ?? "",
          centuryHalfCenturyOrder: century.halfCenturyOrder ?? 0,
          centuryStartYear: century.startYear ?? 0,
          centuryEndYear: century.endYear ?? 0,
          centuryShowInTimeLine: Boolean(century.showInTimeLine),
          birthYearInLHijri: poet.birthYearInLHijri ?? null,
          validBirthDate: Boolean(poet.validBirthDate),
          deathYearInLHijri: poet.deathYearInLHijri ?? null,
          validDeathDate: Boolean(poet.validDeathDate),
          pinOrder: poet.pinOrder ?? 0,
        });
        poetCount += 1;
      });
    });

  if (poetCount > 0) {
    return poetCount;
  }

  const response = await fetchJson(`${GANJOOR_API_BASE_URL}/api/ganjoor/poets`);
  const poets = Array.isArray(response.data) ? response.data : [];

  poets.forEach((poet) => {
    const slug = getGanjoorSlug(poet.fullUrl);
    addEntry(entries, slug, {
      source: "ganjoor",
      id: poet.id ?? null,
      name: poet.name ?? "",
      birthYearInLHijri: poet.birthYearInLHijri ?? null,
      validBirthDate: Boolean(poet.validBirthDate),
      deathYearInLHijri: poet.deathYearInLHijri ?? null,
      validDeathDate: Boolean(poet.validDeathDate),
      pinOrder: poet.pinOrder ?? 0,
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
    .filter((category) => (childrenByParent.get(category.id) ?? []).length === 0)
    .filter(
      (category) => !HIDDEN_ECHOLALIA_POET_SLUGS.has(decodeWordPressSlug(category.slug)),
    );

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
    const imageStats = await hydratePoetImages(sortedEntries);

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
    console.log(
      `Poet images: ${imageStats.downloaded} local, ${imageStats.failed} failed, ${imageStats.skipped} skipped`,
    );
  } catch (error) {
    console.warn("Could not refresh poet source index; keeping existing file.");
    console.warn(error instanceof Error ? error.message : error);
  }
};

await main();
