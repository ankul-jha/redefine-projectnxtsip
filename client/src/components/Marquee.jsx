import styles from './Marquee.module.css';

// Each band repeats the words enough times to span wide screens, twice over so the loop is seamless.
const REPEAT = 3;

function Band({ words, reverse }) {
  const run = Array.from({ length: REPEAT }, () => words).flat();
  return (
    <div className={styles.band} data-reverse={reverse}>
      <div className={styles.track}>
        {[0, 1].map((half) => (
          <p key={half} className={styles.run}>
            {run.map((word, index) => (
              <span key={index} className={styles.item}>
                {word}
                <svg viewBox="0 0 24 34" className={styles.drop}>
                  <path d="M12 1.5C9 8 3 14.5 3 21.5a9 9 0 0 0 18 0C21 14.5 15 8 12 1.5Z" />
                </svg>
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}

// Two bands of words crossing at a slight angle and sliding in opposite directions. Decorative, so hidden from
// screen readers.
export default function Marquee({ words }) {
  if (words.length === 0) return null;
  return (
    <div className={styles.root} aria-hidden="true">
      <Band words={words} />
      <Band words={[...words].reverse()} reverse />
    </div>
  );
}
