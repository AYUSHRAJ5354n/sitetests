const state = {
  posts: [],
  query: ""
};

const elements = {
  postList: document.querySelector("#post-list"),
  search: document.querySelector("#search"),
  shownCount: document.querySelector("#shown-count"),
  empty: document.querySelector("#empty"),
  postCount: document.querySelector("#post-count"),
  qualityCount: document.querySelector("#quality-count"),
  latestDate: document.querySelector("#latest-date"),
  refreshFeed: document.querySelector("#refresh-feed"),
  syncNote: document.querySelector("#sync-note")
};

elements.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderPosts();
});

elements.refreshFeed.addEventListener("click", () => {
  refreshPosts({ force: true });
});

refreshPosts();

async function refreshPosts(options = {}) {
  try {
    elements.refreshFeed.disabled = true;
    elements.refreshFeed.textContent = "Refreshing";
    elements.syncNote.textContent = "Refreshing from SubsPlease RSS";

    const response = await fetch("/api/posts");

    if (!response.ok) {
      throw new Error("Feed request failed");
    }

    const data = await response.json();
    state.posts = data.posts || [];
    updateStatus(data.refreshedAt);
    renderPosts();
  } catch (error) {
    elements.postList.innerHTML = "";
    elements.empty.classList.remove("hidden");
    elements.empty.querySelector("h3").textContent = "Feed unavailable";
    elements.empty.querySelector("p").textContent =
      "The backend could not reach SubsPlease RSS. Try refreshing in a moment.";
    elements.postCount.textContent = "Feed unavailable";
    elements.qualityCount.textContent = "No downloads loaded";
    elements.latestDate.textContent = "Retry soon";
    elements.syncNote.textContent = "Feed refresh failed";
  } finally {
    elements.refreshFeed.disabled = false;
    elements.refreshFeed.textContent = options.force ? "Refresh Again" : "Refresh Feed";
  }
}

function updateStatus(refreshedAt) {
  const qualityTotal = state.posts.reduce((total, post) => total + post.qualities.length, 0);
  const latest = state.posts[0]?.publishedAt ? formatFullDate(state.posts[0].publishedAt) : "Waiting";

  elements.postCount.textContent = `${state.posts.length} posts`;
  elements.qualityCount.textContent = `${qualityTotal} download options`;
  elements.latestDate.textContent = `Latest ${latest}`;
  elements.syncNote.textContent = refreshedAt
    ? `Feed refreshed ${formatFullDate(refreshedAt)}`
    : "Feed refreshed";
}

function renderPosts() {
  const query = state.query.trim().toLowerCase();
  const posts = query
    ? state.posts.filter((post) => {
        const haystack = `${post.showName} ${post.episode} ${post.title}`.toLowerCase();
        return haystack.includes(query);
      })
    : state.posts;

  elements.shownCount.textContent = `${posts.length} shown`;
  elements.empty.classList.toggle("hidden", posts.length > 0);
  elements.postList.innerHTML = posts.map(renderPost).join("");
}

function renderPost(post) {
  const qualities = post.qualities.map(renderQuality).join("");

  return `
    <article class="post">
      <div class="post-main">
        <div class="post-kicker">
          <span class="badge hot">EP ${escapeHtml(post.episode)}</span>
          <span class="badge">${formatShortDate(post.publishedAt)}</span>
          <span class="badge">${post.qualities.length} qualities</span>
        </div>
        <h3>${escapeHtml(post.title)}</h3>
        <p class="post-summary">
          Automatic post for ${escapeHtml(post.showName)}. Open the episode source,
          check AniList, or start a magnet download in your preferred torrent client.
        </p>
        <div class="post-links">
          <a class="action primary" href="${escapeAttribute(post.subsPleaseUrl)}" target="_blank" rel="noreferrer">Post EP</a>
          <a class="action secondary" href="${escapeAttribute(post.anilistUrl)}" target="_blank" rel="noreferrer">AniList</a>
        </div>
      </div>
      <div class="quality-table">
        <p class="quality-title">Download buttons</p>
        <div class="quality-list">${qualities}</div>
      </div>
    </article>
  `;
}

function renderQuality(quality) {
  const torrentLink = quality.torrent
    ? `<a class="mini-link" href="${escapeAttribute(quality.torrent)}" target="_blank" rel="noreferrer">Torrent</a>`
    : "";

  return `
    <div class="quality">
      <strong>${escapeHtml(quality.quality)}</strong>
      <div class="download-group">
        <a class="mini-link" href="${escapeAttribute(quality.magnet)}">Magnet</a>
        ${torrentLink}
      </div>
    </div>
  `;
}

function formatShortDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatFullDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Waiting";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
