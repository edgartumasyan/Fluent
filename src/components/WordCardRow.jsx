import { memo } from "react";
import { speakWord } from "../speak";
import { CAN_EDIT } from "../data";

const SpeakerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const FlagIcon = ({ filled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// A word card, stacked in two rows: the top row holds the number, English and
// the pronounce button; the bottom row holds the two translations and delete.
const WordCardRow = memo(function WordCardRow({
  word,
  index,
  vis,
  onToggle,
  onDelete,
  isWrong,
  onToggleWrong,
}) {
  return (
    <div className="word-card">
      <div className="card-top">
        <div className="card-index">{index}</div>
        <div
          className={vis.english ? "card-english shown" : "card-english hidden"}
          onClick={() => onToggle(word.id, "english")}
        >
          {vis.english ? word.english : "Tap to reveal"}
        </div>
        <button
          className="speak-btn"
          onClick={() => speakWord(word.english)}
          aria-label={`Pronounce ${word.english}`}
        >
          <SpeakerIcon />
        </button>
      </div>
      <div className="card-trans">
        <div
          className={vis.armenian ? "chip chip-a shown" : "chip hidden"}
          onClick={() => onToggle(word.id, "armenian")}
        >
          {vis.armenian ? word.armenian : "Armenian"}
        </div>
        <div
          className={vis.russian ? "chip chip-r shown" : "chip hidden"}
          onClick={() => onToggle(word.id, "russian")}
        >
          {vis.russian ? word.russian : "Russian"}
        </div>
        <button
          className={isWrong ? "wrong-btn on" : "wrong-btn"}
          onClick={() => onToggleWrong(word.id)}
          aria-label={isWrong ? `Unmark ${word.english}` : `Mark ${word.english} wrong`}
          aria-pressed={isWrong}
        >
          <FlagIcon filled={isWrong} />
        </button>
        {CAN_EDIT && (
          <button
            className="delete-btn"
            onClick={() => onDelete(word.id)}
            aria-label={`Delete ${word.english}`}
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
});

export default WordCardRow;
