import myWords from "./my-words.json";
import carolineWords from "./caroline-words.json";

// Static word sources bundled at build time (GitHub Pages has no backend).
const SOURCES = {
  my: myWords,
  caroline: carolineWords,
};

const addedKey = (source) => `vocab-added-${source}`;
const deletedKey = (source) => `vocab-deleted-${source}`;
const wrongKey = (source) => `vocab-wrong-${source}`;

function loadList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

const loadAdded = (source) => loadList(addedKey(source));
const loadDeleted = (source) => loadList(deletedKey(source));

// Under `npm run dev` the Vite words-api plugin owns the JSON files on disk, so
// edits go straight to them and show up in `git status` ready to be committed
// and deployed. The built app has no backend (GitHub Pages is static), so there
// the bundled JSON is read-only and edits become a localStorage overlay that
// never leaves the browser it was made in.
const EDITS_JSON_ON_DISK = import.meta.env.DEV;

const apiUrl = (source, params = "") =>
  `/api/words?source=${encodeURIComponent(source)}${params}`;

// Returns the bundled words plus any words the user added locally, minus any the
// user has deleted (bundled deletions are tracked as a list of ids).
export async function getWords(source) {
  if (EDITS_JSON_ON_DISK) {
    const res = await fetch(apiUrl(source));
    if (!res.ok) throw new Error(`Loading words failed: ${res.status}`);
    return res.json();
  }
  const base = SOURCES[source] || SOURCES.my;
  const deleted = new Set(loadDeleted(source));
  return [...base, ...loadAdded(source)].filter((w) => !deleted.has(w.id));
}

// Persists a new word and returns the created record. The id is derived from
// every known word (bundled + added) so it never collides with a deleted
// bundled id.
export async function addWord(source, { english, russian, armenian }) {
  if (EDITS_JSON_ON_DISK) {
    const res = await fetch(apiUrl(source), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ english, russian, armenian }),
    });
    if (!res.ok) throw new Error(`Adding a word failed: ${res.status}`);
    return res.json();
  }
  const base = SOURCES[source] || SOURCES.my;
  const added = loadAdded(source);
  const maxId = [...base, ...added].reduce((m, w) => Math.max(m, w.id), 0);
  const newWord = {
    id: maxId + 1,
    english: english.trim(),
    russian: russian.trim(),
    armenian: armenian.trim(),
  };
  localStorage.setItem(addedKey(source), JSON.stringify([...added, newWord]));
  return newWord;
}

// Removes a word. Locally-added words are dropped from the added list; bundled
// words (which can't be edited on disk) are recorded in the deleted list.
export async function deleteWord(source, id) {
  if (EDITS_JSON_ON_DISK) {
    const res = await fetch(apiUrl(source, `&id=${id}`), { method: "DELETE" });
    if (!res.ok) throw new Error(`Deleting a word failed: ${res.status}`);
    return;
  }
  const added = loadAdded(source);
  if (added.some((w) => w.id === id)) {
    localStorage.setItem(
      addedKey(source),
      JSON.stringify(added.filter((w) => w.id !== id)),
    );
    return;
  }
  const deleted = loadDeleted(source);
  if (!deleted.includes(id)) {
    localStorage.setItem(deletedKey(source), JSON.stringify([...deleted, id]));
  }
}

// The set of word ids the user has flagged "wrong" for a source, persisted so a
// review list survives reloads. Kept per-source, like added/deleted.
export function getWrongIds(source) {
  return loadList(wrongKey(source));
}

// Adds or removes a word id from the source's wrong list and returns the result.
export function toggleWrong(source, id) {
  const list = loadList(wrongKey(source));
  const next = list.includes(id)
    ? list.filter((x) => x !== id)
    : [...list, id];
  localStorage.setItem(wrongKey(source), JSON.stringify(next));
  return next;
}

// Empties the source's wrong list.
export function clearWrong(source) {
  localStorage.setItem(wrongKey(source), JSON.stringify([]));
}
