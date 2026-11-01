import { useEffect, useState } from 'react';
import { DEFAULT_CONTENT } from '../brand.js';
import { adminApi } from './api.js';
import styles from './admin.module.css';
import { useAdminData, useSession } from './session.jsx';

const MAX_FACTS = 4;
const MAX_MARQUEE = 8;
const MAX_MINERALS = 6;
const STEP_ICONS = ['Filter', 'Membrane', 'Minerals', 'Light'];

const valueAt = (object, path) => path.reduce((value, key) => value[key], object);

function withValue(object, path, value) {
  const next = structuredClone(object);
  path.slice(0, -1).reduce((parent, key) => parent[key], next)[path.at(-1)] = value;
  return next;
}

const padded = (list, length) => [...list, ...Array(length).fill('')].slice(0, length);
const filled = (list) => list.map((item) => item.trim()).filter(Boolean);

// Saved content over the defaults, with the lists padded to a fixed number of inputs.
function toForm(saved) {
  const content = { ...DEFAULT_CONTENT, ...saved };
  return {
    ...content,
    hero: { ...content.hero, facts: padded(content.hero.facts, MAX_FACTS) },
    marquee: padded(content.marquee, MAX_MARQUEE),
  };
}

const toContent = (form) => ({
  ...form,
  hero: { ...form.hero, facts: filled(form.hero.facts) },
  marquee: filled(form.marquee),
});

export default function Content() {
  const { data, error } = useAdminData(adminApi.content);
  const { expire } = useSession();
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ errors: {}, message: null, saved: false, saving: false });

  useEffect(() => {
    if (data) setForm(toForm(data.content));
  }, [data]);

  // A text field bound to one value in the form, by its path.
  const text = (path, label, { max, multiline = false, wide = multiline } = {}) => {
    const id = `content-${path.join('-')}`;
    const Control = multiline ? 'textarea' : 'input';
    return (
      <div className={wide ? `field ${styles.wide}` : 'field'}>
        <label htmlFor={id}>{label}</label>
        <Control
          id={id}
          value={valueAt(form, path)}
          maxLength={max}
          rows={multiline ? 3 : undefined}
          onChange={(event) => setForm((current) => withValue(current, path, event.target.value))}
        />
      </div>
    );
  };

  const section = (key) => status.errors[key] && <p className={`field-error ${styles.wide}`}>{status.errors[key]}</p>;

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ errors: {}, message: null, saved: false, saving: true });
    try {
      const { content } = await adminApi.saveContent(toContent(form));
      setForm(toForm(content));
      setStatus({ errors: {}, message: null, saved: true, saving: false });
    } catch (failure) {
      if (failure.status === 401) return expire();
      setStatus({ errors: failure.details?.fields ?? {}, message: failure.message, saved: false, saving: false });
    }
  }

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1>Page content</h1>
          <p className={styles.muted}>
            The words on the home page and the soda page. Wrap a word of a title in *asterisks* to set it in the
            italic accent.
          </p>
        </div>
      </header>
      {(error || status.message) && <p className="alert alert--error">{error || status.message}</p>}
      {form && (
        <form className={styles.settings} onSubmit={handleSubmit} noValidate>
          <section className={`${styles.panel} ${styles.form}`}>
            <h2 className={styles.wide}>Opening poster</h2>
            {text(['hero', 'ribbon'], 'Words printed on the ribbon', { max: 40 })}
            {text(['hero', 'title'], 'Title', { max: 60 })}
            {text(['intro'], 'Introduction', { max: 200, multiline: true })}
            {text(['headline'], 'Page headline (for search engines and screen readers)', { max: 80, wide: true })}
            {text(['hero', 'size'], 'Size shown with the facts', { max: 20 })}
            {form.hero.facts.map((_, index) => (
              <div key={index}>
                {text(['hero', 'facts', index], `Fact ${index + 1}${index > 0 ? ' (optional)' : ''}`, { max: 60 })}
              </div>
            ))}
            {section('hero')}
            {section('headline')}
            {section('intro')}
          </section>

          <section className={`${styles.panel} ${styles.form}`}>
            <h2 className={styles.wide}>01 · The source</h2>
            {text(['source', 'title'], 'Title', { max: 80, wide: true })}
            {text(['source', 'text'], 'Text', { max: 400, multiline: true })}
            {section('source')}
          </section>

          <section className={`${styles.panel} ${styles.form}`}>
            <h2 className={styles.wide}>02 · In every bottle</h2>
            {text(['balance', 'title'], 'Title', { max: 80, wide: true })}
            {text(['balance', 'text'], 'Text', { max: 400, multiline: true })}
            <div className={styles.wide}>
              <div className={styles.panelHead}>
                <h3>Mineral values</h3>
                <button
                  type="button"
                  className="button button--secondary button--small"
                  disabled={form.minerals.length >= MAX_MINERALS}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      minerals: [...current.minerals, { label: '', value: '', unit: '' }],
                    }))
                  }
                >
                  Add value
                </button>
              </div>
              <p className={styles.muted}>Use the figures from your lab report.</p>
              {form.minerals.map((_, index) => (
                <div key={index} className={styles.mineral}>
                  {text(['minerals', index, 'label'], 'Name', { max: 20 })}
                  {text(['minerals', index, 'value'], 'Value', { max: 10 })}
                  {text(['minerals', index, 'unit'], 'Unit', { max: 10 })}
                  <button
                    type="button"
                    className="link-button"
                    disabled={form.minerals.length <= 1}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        minerals: current.minerals.filter((__, position) => position !== index),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            {section('balance')}
            {section('minerals')}
          </section>

          <section className={`${styles.panel} ${styles.form}`}>
            <h2 className={styles.wide}>03 · Sealed</h2>
            {text(['seal', 'title'], 'Title', { max: 80, wide: true })}
            {text(['seal', 'text'], 'Text', { max: 400, multiline: true })}
            {section('seal')}
          </section>

          <section className={`${styles.panel} ${styles.form}`}>
            <h2 className={styles.wide}>04 · Purification</h2>
            {text(['process', 'title'], 'Title', { max: 80, wide: true })}
            {form.process.steps.map((_, index) => (
              <fieldset key={index} className={styles.step}>
                <legend>
                  Step {index + 1} · {STEP_ICONS[index]} icon
                </legend>
                {text(['process', 'steps', index, 'title'], 'Title', { max: 40 })}
                {text(['process', 'steps', index, 'text'], 'Text', { max: 200 })}
              </fieldset>
            ))}
            {section('process')}
          </section>

          <section className={`${styles.panel} ${styles.form}`}>
            <h2 className={styles.wide}>Closing poster</h2>
            {text(['cta', 'word'], 'Big word behind the bottle', { max: 16 })}
            {text(['cta', 'text'], 'Line under it', { max: 200, wide: true })}
            {section('cta')}
          </section>

          <section className={`${styles.panel} ${styles.form}`}>
            <h2 className={styles.wide}>Moving strip</h2>
            <p className={`${styles.muted} ${styles.wide}`}>
              The words sliding across the top of the footer (2 to 8).
            </p>
            {form.marquee.map((_, index) => (
              <div key={index}>{text(['marquee', index], `Words ${index + 1}`, { max: 30 })}</div>
            ))}
            {section('marquee')}
          </section>

          <section className={`${styles.panel} ${styles.form}`}>
            <h2 className={styles.wide}>Soda page</h2>
            {text(['soda', 'title'], 'Title', { max: 40 })}
            {text(['soda', 'text'], 'Text', { max: 300, multiline: true })}
            {section('soda')}
          </section>

          <div className={styles.formActions}>
            <button type="submit" className="button" disabled={status.saving}>
              {status.saving ? 'Saving…' : 'Save content'}
            </button>
            <button type="button" className="button button--secondary" onClick={() => setForm(toForm(null))}>
              Reset to the original copy
            </button>
            {status.saved && <span className={styles.saved}>Saved. The store shows it on its next load.</span>}
          </div>
        </form>
      )}
    </>
  );
}
