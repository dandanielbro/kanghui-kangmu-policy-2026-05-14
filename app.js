const state = {
  data: null,
  storageKey: "",
  speakerAliases: {},
  speakerRegistry: []
};

async function loadTranscript() {
  try {
    const response = await fetch("./content/transcript.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load transcript.json: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (window.__TRANSCRIPT_DATA__) {
      return window.__TRANSCRIPT_DATA__;
    }
    throw error;
  }
}

function fillText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value || "";
  }
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function applyInlineEmphasis(text = "") {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="keyword-strong">$1</strong>');
  return html;
}

function renderMeta(meta = {}) {
  const container = document.getElementById("meta-row");
  const chips = [
    meta.speaker ? `講者：${meta.speaker}` : "",
    meta.recordedAt ? `錄製：${meta.recordedAt}` : "",
    meta.duration ? `長度：${meta.duration}` : "",
    meta.status ? `狀態：${meta.status}` : ""
  ].filter(Boolean);

  container.replaceChildren(...chips.map((text) => {
    const chip = document.createElement("div");
    chip.className = "meta-chip";
    chip.textContent = text;
    return chip;
  }));
}

function renderList(id, items = []) {
  const container = document.getElementById(id);
  if (!container) {
    return;
  }
  container.replaceChildren(...items.map((item) => {
    const li = document.createElement("li");
    li.innerHTML = applyInlineEmphasis(item);
    return li;
  }));
}

function getSpeakerToneClass(label = "") {
  const text = String(label).trim();
  if (!text) {
    return "speaker-other";
  }
  if (text.includes("一燈")) {
    return "speaker-host";
  }
  if (/(提問者|學員|回應者)/.test(text)) {
    return "speaker-question";
  }
  return "speaker-other";
}

function splitSpeakerLine(rawText = "") {
  const text = String(rawText).trim();
  const match = text.match(/^([^：]{1,20})：(.*)$/u);
  if (!match) {
    return null;
  }

  const label = match[1].trim();
  const body = match[2].trim();
  return {
    label,
    body,
    toneClass: getSpeakerToneClass(label)
  };
}

function buildSpeakerParagraph(rawText = "") {
  const p = document.createElement("p");
  const parsed = splitSpeakerLine(rawText);
  if (!parsed) {
    p.innerHTML = applyInlineEmphasis(rawText);
    return p;
  }

  const speaker = document.createElement("strong");
  speaker.className = `speaker-label ${parsed.toneClass}`;
  speaker.textContent = `${parsed.label}：`;

  const text = document.createElement("span");
  text.className = "speaker-line";
  text.innerHTML = applyInlineEmphasis(parsed.body);

  p.classList.add("has-speaker", parsed.toneClass);
  p.append(speaker, document.createTextNode(" "), text);
  return p;
}

function sanitizeKey(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function buildSpeakerRegistry(data = {}) {
  const registry = [];
  const seen = new Set();

  const speakers = Array.isArray(data.speakers) ? data.speakers : [];
  for (const speaker of speakers) {
    const rawKey = speaker.id || speaker.raw || speaker.name;
    const id = sanitizeKey(rawKey);
    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    registry.push({
      id,
      originalKey: rawKey,
      defaultName: speaker.name || String(rawKey),
      note: speaker.note || speaker.raw || ""
    });
  }

  for (const section of data.sections || []) {
    for (const turn of section.turns || []) {
      const rawKey = turn.speaker;
      const id = sanitizeKey(rawKey);
      if (!id || seen.has(id)) {
        continue;
      }

      seen.add(id);
      registry.push({
        id,
        originalKey: rawKey,
        defaultName: String(rawKey),
        note: "由自動標註或逐段整理稿帶入，可在此手動改成真人名稱。"
      });
    }
  }

  return registry;
}

function buildStorageKey(data = {}) {
  const base = data.meta?.recordedAt || data.title || "transcript";
  return `jarvis-transcript-speakers:${sanitizeKey(base)}`;
}

function loadSpeakerAliases(storageKey) {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
}

function saveSpeakerAliases() {
  if (!state.storageKey) {
    return;
  }
  localStorage.setItem(state.storageKey, JSON.stringify(state.speakerAliases));
}

function getSpeakerLabel(rawSpeaker) {
  const id = sanitizeKey(rawSpeaker);
  if (!id) {
    return "未標記";
  }
  const alias = state.speakerAliases[id];
  if (alias && alias.trim()) {
    return alias.trim();
  }
  const entry = state.speakerRegistry.find((speaker) => speaker.id === id);
  return entry?.defaultName || String(rawSpeaker);
}

function renderSpeakers(speakers = []) {
  const container = document.getElementById("speaker-legend");
  container.replaceChildren(...speakers.map((speaker) => {
    const item = document.createElement("div");
    item.className = "speaker-legend-item";

    const row = document.createElement("div");
    row.className = "speaker-legend-row";

    const meta = document.createElement("div");
    meta.className = "speaker-legend-meta";

    const title = document.createElement("strong");
    title.textContent = speaker.defaultName;

    const key = document.createElement("code");
    key.className = "speaker-key";
    key.textContent = speaker.originalKey;

    meta.append(title, key);

    const input = document.createElement("input");
    input.className = "speaker-input";
    input.type = "text";
    input.value = state.speakerAliases[speaker.id] || "";
    input.placeholder = `替 ${speaker.defaultName} 命名`;
    input.setAttribute("aria-label", `替 ${speaker.defaultName} 命名`);
    input.addEventListener("input", (event) => {
      const value = event.target.value.trim();
      if (value) {
        state.speakerAliases[speaker.id] = value;
      } else {
        delete state.speakerAliases[speaker.id];
      }
      saveSpeakerAliases();
      renderSections(state.data?.sections || []);
    });

    const note = document.createElement("span");
    note.textContent = speaker.note;

    row.append(meta, input);
    item.append(row, note);
    return item;
  }));

  const resetButton = document.getElementById("speaker-reset");
  if (resetButton) {
    resetButton.hidden = speakers.length === 0;
  }
}

function renderNav(sections = []) {
  const container = document.getElementById("section-nav");
  container.replaceChildren(...sections.map((section, index) => {
    const link = document.createElement("a");
    link.className = "section-link";
    link.href = `#${section.id}`;

    const strong = document.createElement("strong");
    strong.textContent = `${String(index + 1).padStart(2, "0")} ${section.title}`;

    const span = document.createElement("span");
    span.textContent = section.timeRange || section.focus || "";

    link.append(strong, span);
    return link;
  }));
}

function createBadge(text) {
  const badge = document.createElement("span");
  badge.className = "segment-badge";
  badge.textContent = text;
  return badge;
}

function renderSections(sections = []) {
  const template = document.getElementById("section-template");
  const container = document.getElementById("sections");

  container.replaceChildren(...sections.map((section, index) => {
    const node = template.content.firstElementChild.cloneNode(true);

    node.id = section.id;
    node.querySelector(".segment-index").textContent = String(index + 1).padStart(2, "0");
    node.querySelector(".segment-kicker").textContent = section.kicker || `Section ${index + 1}`;
    node.querySelector(".segment-title").textContent = section.title || `未命名段落 ${index + 1}`;
    const focus = node.querySelector(".segment-focus");
    if (section.focus) {
      focus.innerHTML = applyInlineEmphasis(section.focus);
      focus.hidden = false;
    } else {
      focus.hidden = true;
    }

    const meta = node.querySelector(".segment-meta");
    if (section.timeRange) {
      meta.append(createBadge(section.timeRange));
    }
    if (section.tag) {
      meta.append(createBadge(section.tag));
    }

    const highlightBlock = node.querySelector(".highlight-block");
    const highlightList = node.querySelector(".highlight-list");
    const highlights = section.highlights || [];
    if (highlights.length > 0) {
      highlightBlock.hidden = false;
      highlightList.replaceChildren(...highlights.map((item) => {
        const li = document.createElement("li");
        li.innerHTML = applyInlineEmphasis(item);
        return li;
      }));
    } else {
      highlightBlock.hidden = true;
    }

    const transcriptContainer = node.querySelector(".transcript-paragraphs");
    const turns = section.turns || [];

    if (turns.length > 0) {
      transcriptContainer.replaceChildren(...turns.map((turn) => {
        const wrapper = document.createElement("div");
        const speakerLabel = getSpeakerLabel(turn.speaker);
        const toneClass = getSpeakerToneClass(speakerLabel);
        wrapper.className = `turn ${toneClass}`;

        const speaker = document.createElement("div");
        speaker.className = `turn-speaker ${toneClass}`;
        speaker.textContent = `${speakerLabel}：`;

        const text = document.createElement("p");
        text.className = "turn-text";
        text.innerHTML = applyInlineEmphasis(turn.text || "");

        wrapper.append(speaker, text);
        return wrapper;
      }));
    } else {
      transcriptContainer.replaceChildren(...(section.transcript || []).map((paragraph) => buildSpeakerParagraph(paragraph)));
    }

    const voiceNote = node.querySelector(".voice-note");
    if (section.voiceNote) {
      node.querySelector(".voice-note-text").innerHTML = applyInlineEmphasis(section.voiceNote);
    } else {
      voiceNote.hidden = true;
    }

    return node;
  }));
}

function renderPage(data) {
  state.data = data;
  state.storageKey = buildStorageKey(data);
  state.speakerRegistry = buildSpeakerRegistry(data);
  state.speakerAliases = loadSpeakerAliases(state.storageKey);

  if (data.title) {
    document.title = data.title;
  }

  fillText("page-title", data.title);
  fillText("page-subtitle", data.subtitle);
  fillText("content-note", data.contentNote);
  renderMeta(data.meta);
  renderList("summary-list", data.summaryHighlights);
  renderSpeakers(state.speakerRegistry);
  renderNav(data.sections);
  renderSections(data.sections);
}

function renderError(error) {
  fillText("page-title", "逐字稿資料尚未準備完成");
  fillText("page-subtitle", "請確認 `content/transcript.json` 或 `content/transcript.inline.js` 已存在且格式正確。");
  fillText("content-note", error.message);
}

function setupSpeakerReset() {
  const button = document.getElementById("speaker-reset");
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    state.speakerAliases = {};
    if (state.storageKey) {
      localStorage.removeItem(state.storageKey);
    }
    renderSpeakers(state.speakerRegistry);
    renderSections(state.data?.sections || []);
  });
}

setupSpeakerReset();

loadTranscript()
  .then(renderPage)
  .catch(renderError);
