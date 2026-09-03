import { useRef, useState } from "react";
import { speakWord } from "../speak";

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

const ChevronLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

function Toggle({ label, on, onClick }) {
  return (
    <button
      type="button"
      className="practice-toggle"
      onClick={onClick}
      aria-pressed={on}
    >
      <span>{label}</span>
      <span className={`switch ${on ? "on" : ""}`}>
        <span className="knob" />
      </span>
    </button>
  );
}

// Minimum horizontal travel (px) before a touch counts as a swipe rather than a tap.
const SWIPE_THRESHOLD = 50;

function PracticeView({
  word,
  index,
  total,
  showFront,
  onFlip,
  onPrev,
  onNext,
  shuffle,
  onToggleShuffle,
  hideWord,
  onToggleHideWord,
  startFromValue,
  onChangeStartFrom,
  reviewOnly,
  onToggleReviewOnly,
  wrongCount,
  onClearWrong,
  isCurrentWrong,
  onToggleCurrentWrong,
}) {
  const touchStartX = useRef(null);
  // While the user is typing, the field holds their raw text instead of the
  // derived card number, so partial input ("3" on the way to "345") and an
  // empty field survive re-renders instead of snapping back to the current card.
  const [startDraft, setStartDraft] = useState(null);

  const handleStartChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setStartDraft(raw);
    const n = Number(raw);
    if (raw !== "" && n >= 1) onChangeStartFrom(Math.min(n, total));
  };
  const handleStartBlur = () => setStartDraft(null);
  const handleStartKeyDown = (e) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0) onNext();
    else onPrev();
  };

  // Arrow taps navigate without flipping the card underneath them.
  const handlePrev = (e) => {
    e.stopPropagation();
    onPrev();
  };
  const handleNext = (e) => {
    e.stopPropagation();
    onNext();
  };

  return (
    <div className="practice">
      <div className="practice-controls">
        <div className="practice-controls-top">
          <div className="practice-count">
            Card {total ? index + 1 : 0} of {total}
          </div>
          {wrongCount > 0 && (
            <button className="clear-wrong-btn" onClick={onClearWrong}>
              Clear wrong list ({wrongCount})
            </button>
          )}
        </div>
        <div className="practice-toggles">
          <Toggle label="Random" on={shuffle} onClick={onToggleShuffle} />
          <Toggle label="Show word" on={!hideWord} onClick={onToggleHideWord} />
          <Toggle
            label={`Wrong only (${wrongCount})`}
            on={reviewOnly}
            onClick={onToggleReviewOnly}
          />
        </div>
        <div className="practice-start">
          <span className="practice-start-label">Start from</span>
          <input
            id="practice-start-input"
            className="practice-start-input"
            type="number"
            inputMode="numeric"
            min="1"
            max={total}
            value={startDraft ?? startFromValue}
            onChange={handleStartChange}
            onFocus={(e) => e.target.select()}
            onBlur={handleStartBlur}
            onKeyDown={handleStartKeyDown}
          />
          <span className="practice-start-suffix">of {total}</span>
        </div>
      </div>

      {total === 0 ? (
        <div className="practice-empty">
          No wrong words yet. Mark a word wrong while practicing to add it here.
        </div>
      ) : (
        <>
          <div className="practice-card-wrap">
            <div
              key={`${index}-${showFront}`}
              className="flashcard"
              onClick={onFlip}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {showFront ? (
                hideWord ? (
                  <>
                    <div className="flash-word masked">{word.english}</div>
                    <div className="flash-hint">Tap to reveal translation</div>
                  </>
                ) : (
                  <>
                    <div className="flash-word">{word.english}</div>
                    <div className="flash-hint">Tap to reveal</div>
                  </>
                )
              ) : (
                <div className="flash-back">
                  {hideWord && (
                    <div className="flash-back-word">{word.english}</div>
                  )}
                  <div className="reveal-chip chip-a">{word.armenian}</div>
                  <div className="reveal-chip chip-r">{word.russian}</div>
                </div>
              )}
            </div>
            <button
              className="card-nav-btn prev"
              onClick={handlePrev}
              aria-label="Previous word"
            >
              <ChevronLeftIcon />
            </button>
            <button
              className="card-nav-btn next"
              onClick={handleNext}
              aria-label="Next word"
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div className="practice-actions">
            <button
              className={isCurrentWrong ? "mark-wrong-btn on" : "mark-wrong-btn"}
              onClick={onToggleCurrentWrong}
              aria-pressed={isCurrentWrong}
            >
              {isCurrentWrong ? "Remove from Wrong List" : "Mark Wrong"}
            </button>
            <button
              className="listen-btn"
              onClick={() => speakWord(word.english)}
            >
              <SpeakerIcon />
              Listen
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default PracticeView;
