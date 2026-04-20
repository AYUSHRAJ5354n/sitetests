const RSS_URL = "https://subsplease.org/rss/";
const QUALITY_PATTERN = /[\[(](480p|720p|1080p|2160p|4K)[\])]/i;
const EPISODE_PATTERN = /\s-\s(\d+(?:\.\d+)?)(?:\s|$)/;
const BATCH_PATTERN = /\((\d+(?:\.\d+)?-\d+(?:\.\d+)?)\)/;

module.exports = async function handler(request, response) {
  try {
    const upstream = await fetch(RSS_URL, {
      headers: {
        "user-agent": "Anime Current/1.0"
      }
    });

    if (!upstream.ok) {
      throw new Error(`SubsPlease RSS returned ${upstream.status}`);
    }

    const xml = await upstream.text();
    const posts = getEpisodePosts(xml);

    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    response.status(200).json({
      refreshedAt: new Date().toISOString(),
      source: RSS_URL,
      count: posts.length,
      posts
    });
  } catch (error) {
    response.status(502).json({
      error: "Unable to refresh SubsPlease RSS right now.",
      detail: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

function getEpisodePosts(xml) {
  const grouped = new Map();

  for (const item of parseRssItems(xml)) {
    const parsed = parseReleaseTitle(item.title);
    const key = slugify(`${parsed.showName}-${parsed.episode}`);
    const qualityLink = {
      quality: parsed.quality,
      magnet: normalizeMagnet(item.link),
      torrent: item.guid && item.guid.startsWith("http") ? item.guid : undefined,
      fileName: item.title
    };
    const existing = grouped.get(key);

    if (existing) {
      existing.qualities = sortQualities([...existing.qualities, qualityLink]);
      continue;
    }

    grouped.set(key, {
      id: key,
      title: `${parsed.showName} Episode ${parsed.episode}`,
      showName: parsed.showName,
      episode: parsed.episode,
      publishedAt: item.pubDate,
      anilistUrl: `https://anilist.co/search/anime?search=${encodeURIComponent(parsed.showName)}`,
      subsPleaseUrl: `https://subsplease.org/shows/${slugify(parsed.showName)}/`,
      qualities: [qualityLink]
    });
  }

  return [...grouped.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

function parseRssItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
    const block = match[1] || "";

    return {
      title: decodeEntities(readTag(block, "title")),
      link: decodeEntities(readTag(block, "link")),
      pubDate: decodeEntities(readTag(block, "pubDate")),
      guid: decodeEntities(readTag(block, "guid"))
    };
  });
}

function readTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]?.trim() || "";
}

function parseReleaseTitle(title) {
  const withoutGroup = title.replace(/^\[SubsPlease\]\s*/i, "").trim();
  const quality = withoutGroup.match(QUALITY_PATTERN)?.[1]?.toUpperCase() || "HD";
  const cleaned = withoutGroup
    .replace(QUALITY_PATTERN, "")
    .replace(/\s\[[A-F0-9]{8}\]\.mkv$/i, "")
    .replace(/\s\[Batch\]$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const batchRange = cleaned.match(BATCH_PATTERN)?.[1];
  const episode = cleaned.match(EPISODE_PATTERN)?.[1] || (batchRange ? `Batch ${batchRange}` : "New");
  const showName =
    cleaned
      .replace(EPISODE_PATTERN, "")
      .replace(BATCH_PATTERN, "")
      .replace(/\s+/g, " ")
      .trim() || "Latest Release";

  return {
    showName,
    episode,
    quality: quality === "4K" ? "2160P" : quality
  };
}

function sortQualities(qualities) {
  const rank = new Map([
    ["480P", 1],
    ["720P", 2],
    ["1080P", 3],
    ["2160P", 4]
  ]);
  const unique = new Map();

  for (const quality of qualities) {
    unique.set(quality.quality, quality);
  }

  return [...unique.values()].sort(
    (a, b) => (rank.get(a.quality) || 0) - (rank.get(b.quality) || 0)
  );
}

function normalizeMagnet(value) {
  return value.startsWith("magnet:") ? value : value.trim();
}

function decodeEntities(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
