import myWords from "./my-words.json";
import carolineWords from "./caroline-words.json";

// Static word sources bundled at build time (GitHub Pages has no backend).
const SOURCES = {
  my: myWords,
  caroline: carolineWords,
};

const wrongKey = (source) => `vocab-wrong-${source}`;

function loadList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

// Adding and deleting words is a `npm run dev` affair: the Vite words-api
// plugin owns the JSON files on disk, so edits go straight to them and show up
// in `git status` ready to be committed and deployed. The built app has no
// backend to write to (GitHub Pages is static), so there the bundled JSON is
// the whole word list, read-only, and the editing UI is hidden. Deployed edits
// are deliberately impossible rather than kept in a per-browser overlay: an
// overlay only ever existed in the one browser that made it, and never reached
// the JSON the deploy is actually built from.
export const CAN_EDIT = import.meta.env.DEV;

const EDIT_ONLY_IN_DEV = "Words can only be edited when running the app locally";

const apiUrl = (source, params = "") =>
  `/api/words?source=${encodeURIComponent(source)}${params}`;

// In dev, the live JSON file. In the built app, the bundled copy of it (sliced
// so callers can't mutate the imported module).
export async function getWords(source) {
  if (CAN_EDIT) {
    const res = await fetch(apiUrl(source));
    if (!res.ok) throw new Error(`Loading words failed: ${res.status}`);
    return res.json();
  }
  return [...(SOURCES[source] || SOURCES.my)];
}

// Persists a new word to the JSON file and returns the created record.
export async function addWord(source, { english, russian, armenian }) {
  if (!CAN_EDIT) throw new Error(EDIT_ONLY_IN_DEV);
  const res = await fetch(apiUrl(source), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ english, russian, armenian }),
  });
  if (!res.ok) throw new Error(`Adding a word failed: ${res.status}`);
  return res.json();
}

// Removes a word from the JSON file.
export async function deleteWord(source, id) {
  if (!CAN_EDIT) throw new Error(EDIT_ONLY_IN_DEV);
  const res = await fetch(apiUrl(source, `&id=${id}`), { method: "DELETE" });
  if (!res.ok) throw new Error(`Deleting a word failed: ${res.status}`);
}

// The set of word ids the user has flagged "wrong" for a source, persisted so a
// review list survives reloads. This one stays in localStorage everywhere: it's
// per-browser practice state, not word data, so it has nothing to write to disk.
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
