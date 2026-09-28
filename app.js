// 30 Seconds — Datalab
// Word lists live in categories/*.txt and are listed in categories/index.json.

const WORDS_PER_ROUND = 5;
const RING_LENGTH = 2 * Math.PI * 52; // circumference of the timer circle
const WARNING_SECONDS = 5;
const STORAGE_KEY = "thirty-seconds-settings";

const els = {
  categoryList: document.getElementById("categoryList"),
  uploadInput: document.getElementById("uploadInput"),
  durationInput: document.getElementById("durationInput"),
  durationOutput: document.getElementById("durationOutput"),
  deckInfo: document.getElementById("deckInfo"),
  card: document.getElementById("card"),
  ring: document.getElementById("ring"),
  timeLeft: document.getElementById("timeLeft"),
  wordList: document.getElementById("wordList"),
  timesUp: document.getElementById("timesUp"),
  nextBtn: document.getElementById("nextBtn"),
  sound: document.getElementById("timerSound"),
  sidebar: document.getElementById("sidebar"),
  menuBtn: document.getElementById("menuBtn"),
  doneBtn: document.getElementById("doneBtn"),
  backdrop: document.getElementById("backdrop"),
  chooseListsBtn: document.getElementById("chooseListsBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
};

// { name, words: [], custom: bool, selected: bool }
const categories = [];
// Words already shown, per category name, so nothing repeats until a list is used up
const played = new Map();

let duration = 30;
let timerId = null;
let endTime = 0;

// ---------- Helpers ----------

function parseWords(text) {
  const seen = new Set();
  return text
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter((w) => w && !seen.has(w) && seen.add(w));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveSettings() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        duration,
        selected: categories.filter((c) => c.selected).map((c) => c.name),
        custom: categories.filter((c) => c.custom).map(({ name, words }) => ({ name, words })),
      })
    );
  } catch {
    /* storage unavailable — settings just won't be remembered */
  }
}

// ---------- Categories ----------

function addCategory(name, words, { custom = false, selected = false } = {}) {
  const existing = categories.find((c) => c.name === name);
  if (existing) {
    existing.words = words;
    existing.selected = selected || existing.selected;
    played.set(name, new Set());
    return;
  }
  categories.push({ name, words, custom, selected });
  played.set(name, new Set());
}

function renderCategories() {
  els.categoryList.innerHTML = "";
  if (!categories.length) {
    els.categoryList.innerHTML = '<p class="muted">No word lists found.</p>';
  }
  for (const cat of categories) {
    const label = document.createElement("label");
    label.className = "category";

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = cat.selected;
    box.addEventListener("change", () => {
      cat.selected = box.checked;
      onSelectionChange();
    });

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = cat.name;

    const count = document.createElement("span");
    count.className = "count";
    count.textContent = cat.words.length;

    label.append(box, name, count);

    if (cat.custom) {
      const remove = document.createElement("button");
      remove.className = "remove";
      remove.type = "button";
      remove.title = "Remove this list";
      remove.textContent = "×";
      remove.addEventListener("click", (e) => {
        e.preventDefault();
        categories.splice(categories.indexOf(cat), 1);
        played.delete(cat.name);
        renderCategories();
        onSelectionChange();
      });
      label.append(remove);
    }
    els.categoryList.append(label);
  }
}

function selectedCategories() {
  return categories.filter((c) => c.selected && c.words.length);
}

function onSelectionChange() {
  els.nextBtn.disabled = selectedCategories().length === 0;
  els.card.classList.toggle("has-lists", !els.nextBtn.disabled);
  updateDeckInfo();
  saveSettings();
}

function updateDeckInfo() {
  const cats = selectedCategories();
  if (!cats.length) {
    els.deckInfo.textContent = "";
    return;
  }
  const total = cats.reduce((n, c) => n + c.words.length, 0);
  const left = cats.reduce((n, c) => n + c.words.filter((w) => !played.get(c.name).has(w)).length, 0);
  els.deckInfo.textContent = `${left} of ${total} words left before the lists repeat.`;
}

// ---------- Drawing words ----------

// Pick words at random from all selected lists. A word is not shown again
// until every word in the selected lists has been played.
function drawWords() {
  const cats = selectedCategories();
  const unplayed = [];
  for (const c of cats) {
    for (const w of c.words) if (!played.get(c.name).has(w)) unplayed.push({ cat: c.name, word: w });
  }

  let picks = shuffle(unplayed).slice(0, WORDS_PER_ROUND);

  if (picks.length < WORDS_PER_ROUND) {
    // Lists used up: start over, avoiding the words we just picked
    for (const c of cats) played.set(c.name, new Set());
    const chosen = new Set(picks.map((p) => p.word));
    const refill = [];
    for (const c of cats) for (const w of c.words) if (!chosen.has(w)) refill.push({ cat: c.name, word: w });
    picks = picks.concat(shuffle(refill).slice(0, WORDS_PER_ROUND - picks.length));
  }

  for (const p of picks) played.get(p.cat).add(p.word);
  return picks.map((p) => p.word);
}

function showWords(words) {
  els.wordList.innerHTML = "";
  for (const w of words) {
    const li = document.createElement("li");
    li.textContent = w;
    li.addEventListener("click", () => li.classList.toggle("guessed"));
    els.wordList.append(li);
  }
}

// ---------- Timer ----------

function setRing(fraction) {
  els.ring.style.strokeDashoffset = RING_LENGTH * (1 - fraction);
}

function showIdleTime() {
  els.timeLeft.textContent = duration;
  setRing(1);
}

function tick() {
  const remainingMs = Math.max(0, endTime - performance.now());
  const seconds = Math.ceil(remainingMs / 1000);
  els.timeLeft.textContent = seconds;
  setRing(remainingMs / (duration * 1000));
  els.card.classList.toggle("warning", seconds <= WARNING_SECONDS && remainingMs > 0);

  if (remainingMs <= 0) timeUp();
}

function startTimer() {
  clearInterval(timerId);
  endTime = performance.now() + duration * 1000;
  tick();
  // setInterval keeps running (throttled) in background tabs, unlike requestAnimationFrame
  timerId = setInterval(tick, 100);
}

function timeUp() {
  clearInterval(timerId);
  timerId = null;
  els.card.classList.remove("warning");
  els.card.classList.add("over");
  els.timesUp.hidden = false;
  els.sound.currentTime = 0;
  els.sound.play().catch(() => {});
}

// ---------- Rounds ----------

function nextRound() {
  if (els.nextBtn.disabled) return;
  els.sound.pause();
  els.card.classList.remove("idle", "over", "warning");
  els.timesUp.hidden = true;
  showWords(drawWords());
  updateDeckInfo();
  startTimer();
  setSidebar(false);
}

// ---------- Events ----------

els.nextBtn.addEventListener("click", nextRound);

// Click the "Time's up" banner to look at the words again
els.timesUp.addEventListener("click", () => (els.timesUp.hidden = true));

document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea")) return;
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    nextRound();
  } else if (e.key === "f" || e.key === "F") {
    toggleFullscreen();
  }
});

els.durationInput.addEventListener("input", () => {
  duration = Number(els.durationInput.value);
  els.durationOutput.textContent = `${duration} s`;
  if (!timerId) showIdleTime();
  saveSettings();
});

els.uploadInput.addEventListener("change", async () => {
  for (const file of els.uploadInput.files) {
    const words = parseWords(await file.text());
    if (!words.length) continue;
    addCategory(file.name.replace(/\.txt$/i, ""), words, { custom: true, selected: true });
  }
  els.uploadInput.value = "";
  renderCategories();
  onSelectionChange();
});

// Settings slide in from the side on small screens
function setSidebar(open) {
  els.sidebar.classList.toggle("open", open);
  els.backdrop.hidden = !open;
  els.menuBtn.setAttribute("aria-expanded", String(open));
}
els.menuBtn.addEventListener("click", () => setSidebar(!els.sidebar.classList.contains("open")));
els.chooseListsBtn.addEventListener("click", () => setSidebar(true));
els.doneBtn.addEventListener("click", () => setSidebar(false));
els.backdrop.addEventListener("click", () => setSidebar(false));

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}
els.fullscreenBtn.addEventListener("click", toggleFullscreen);

// ---------- Start-up ----------

async function init() {
  const settings = loadSettings();
  const selected = new Set(settings.selected || []);

  duration = settings.duration || 30;
  els.durationInput.value = duration;
  els.durationOutput.textContent = `${duration} s`;
  showIdleTime();

  try {
    const index = await fetch("categories/index.json").then((r) => r.json());
    const lists = await Promise.all(
      index.map(async ({ name, file }) => {
        const res = await fetch(`categories/${file}`);
        return { name, words: res.ok ? parseWords(await res.text()) : [] };
      })
    );
    for (const { name, words } of lists) addCategory(name, words, { selected: selected.has(name) });
  } catch (err) {
    console.error("Could not load word lists", err);
  }

  for (const { name, words } of settings.custom || []) {
    addCategory(name, words, { custom: true, selected: selected.has(name) });
  }

  renderCategories();
  onSelectionChange();
}

init();
