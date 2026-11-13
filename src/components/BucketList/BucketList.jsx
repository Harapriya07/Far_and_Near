import { useMemo, useState } from "react";
import { BUCKET_CATEGORIES } from "../../data/bucketList.js";
import { useSharedBucketList } from "../../context/SharedBucketListContext.jsx";
import { useBucketList as useLegacyBucketList } from "../../utils/bucketListStore.js";
import "./BucketList.css";

const emptyDraft = () => ({ text: "", category: "experiences", targetDate: "", note: "" });
const makeId = () => globalThis.crypto?.randomUUID?.() || `bucket-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function categoryMeta(id) {
  return BUCKET_CATEGORIES.find((category) => category.id === id) ?? BUCKET_CATEGORIES[1];
}

function ItemForm({ draft, setDraft, onSubmit, onCancel, submitLabel, formError, busy = false }) {
  const textId = `bucket-text-${submitLabel.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <form className="bucket-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div className="bucket-form__field">
        <label htmlFor={textId}>Your little dream <span aria-hidden="true">*</span></label>
        <input id={textId} className="bucket-form__input" type="text" placeholder="Something we want to do together…" value={draft.text} onChange={(event) => setDraft({ ...draft, text: event.target.value })} maxLength={160} required aria-invalid={Boolean(formError)} aria-describedby={formError ? `${textId}-error` : `${textId}-hint`} disabled={busy} />
        <div className="bucket-form__helper-row"><span id={`${textId}-hint`}>Keep it short and sweet.</span><span>{draft.text.length}/160</span></div>
        {formError && <p className="bucket-form__error" id={`${textId}-error`} role="alert">{formError}</p>}
      </div>

      <fieldset className="bucket-form__fieldset">
        <legend>Pick a category</legend>
        <div className="bucket-form__categories">
          {BUCKET_CATEGORIES.map((category) => <button type="button" key={category.id} className="tag" data-active={draft.category === category.id} aria-pressed={draft.category === category.id} onClick={() => setDraft({ ...draft, category: category.id })} disabled={busy}><span aria-hidden="true">{category.icon}</span>{category.label}</button>)}
        </div>
      </fieldset>

      <div className="bucket-form__row bucket-form__row--split">
        <div className="bucket-form__field"><label htmlFor={`${textId}-date`}>A date (optional)</label><input id={`${textId}-date`} className="bucket-form__input" type="date" value={draft.targetDate} onChange={(event) => setDraft({ ...draft, targetDate: event.target.value })} disabled={busy} /></div>
        <div className="bucket-form__field"><label htmlFor={`${textId}-note`}>A little note (optional)</label><input id={`${textId}-note`} className="bucket-form__input" type="text" placeholder="The tiny details…" value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} maxLength={140} disabled={busy} /></div>
      </div>
      <div className="bucket-form__actions"><button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>{submitLabel}</button></div>
    </form>
  );
}

function BucketItem({ item, onToggle, onDelete, onEdit, writable }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ text: item.text, category: item.category, targetDate: item.targetDate || "", note: item.note || "" });
  const [formError, setFormError] = useState("");
  const category = categoryMeta(item.category);

  async function submitEdit() {
    const text = draft.text.trim();
    if (!text) { setFormError("Add a few words before saving."); return; }
    if (text.length > 160) { setFormError("Keep each dream to 160 characters or fewer."); return; }
    try { await onEdit(item.id, { ...draft, text }); setFormError(""); setEditing(false); }
    catch (error) { setFormError(error.message || "Your changes could not be saved."); }
  }

  if (editing) return <li className="bucket-item bucket-item--editing glass-card"><ItemForm draft={draft} setDraft={(next) => { setDraft(next); setFormError(""); }} submitLabel="Save changes" onCancel={() => { setEditing(false); setDraft({ text: item.text, category: item.category, targetDate: item.targetDate || "", note: item.note || "" }); setFormError(""); }} onSubmit={submitEdit} formError={formError} /></li>;

  return (
    <li className={`bucket-item glass-card${item.completed ? " bucket-item--done" : ""}`}>
      <button type="button" className="bucket-item__check" aria-label={item.completed ? `Reopen: ${item.text}` : `Complete: ${item.text}`} aria-pressed={item.completed} onClick={() => onToggle(item.id)} disabled={!writable}><span aria-hidden="true">{item.completed ? "✓" : ""}</span></button>
      <div className="bucket-item__body"><p className="bucket-item__text">{item.text}</p><div className="bucket-item__meta"><span className="tag bucket-item__category"><span aria-hidden="true">{category.icon}</span>{category.label}</span>{item.targetDate && <span className="bucket-item__date">{new Date(`${item.targetDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>}</div>{item.note && <p className="bucket-item__note">{item.note}</p>}</div>
      <div className="bucket-item__actions"><button type="button" className="bucket-item__icon-btn" aria-label={`Edit: ${item.text}`} onClick={() => setEditing(true)} disabled={!writable}>Edit</button><button type="button" className="bucket-item__icon-btn bucket-item__icon-btn--delete" aria-label={`Delete: ${item.text}`} onClick={() => onDelete(item.id)} disabled={!writable}>Delete</button></div>
    </li>
  );
}

function BucketList() {
  const { items, error: storageError, loading, ready, addItem: createItem, updateItem, deleteItem: removeItem, importItems } = useSharedBucketList();
  const legacy = useLegacyBucketList();
  const writable = ready && !loading;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");

  const { pending, completed, progress } = useMemo(() => {
    const pendingItems = items.filter((item) => !item.completed);
    const completedItems = items.filter((item) => item.completed);
    return { pending: pendingItems, completed: completedItems, progress: items.length ? Math.round((completedItems.length / items.length) * 100) : 0 };
  }, [items]);

  async function addItem() {
    const text = draft.text.trim();
    if (!text) { setFormError("Add a few words for your bucket-list dream."); return; }
    if (text.length > 160) { setFormError("Keep each dream to 160 characters or fewer."); return; }
    try {
      await createItem({ ...draft, text });
      setDraft(emptyDraft()); setAdding(false); setFormError("");
      setFeedback("Added to your shared list — one more dream to look forward to.");
    } catch (error) { setFormError(error.message || "This dream couldn't be added."); }
  }

  async function toggleItem(id) {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    try {
      await updateItem(id, { ...target, completed: !target.completed });
      setFeedback(target.completed ? "Moved back to your wish list." : "A little dream checked off. Nice one!");
    } catch (error) { setFeedback(error.message || "That change couldn't be saved."); }
  }

  async function deleteItem(id) {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    if (typeof window !== "undefined" && !window.confirm(`Delete “${target.text}” from your bucket list?`)) return;
    try { await removeItem(id); setFeedback("Dream removed from your shared list."); }
    catch (error) { setFeedback(error.message || "That dream couldn't be removed."); }
  }

  async function importLegacyItems() {
    try {
      await importItems(legacy.items);
      setFeedback(`Imported ${legacy.items.length} items. Your original browser copy is still preserved.`);
    } catch (error) { setFeedback(error.message || "Your old list could not be imported."); }
  }

  async function editItem(id, updated) {
    await updateItem(id, updated);
    setFeedback("Your changes have been saved for both of you.");
    return true;
  }

  return (
    <div className="bucket-list">
      <header className="page-head bucket-page-head"><p className="page-head__eyebrow">Little dreams, big plans</p><h1>Our Little Bucket List<span aria-hidden="true"> ♡</span></h1><p>Things to do, places to go, memories to make — one dream at a time.</p><p className="bucket-page-head__local-note">A shared list that stays in sync for both of you, across devices.</p></header>

      {storageError && <div className="bucket-storage-alert" role="alert"><strong>Your shared list could not be loaded.</strong><p>{storageError}</p><p>Your saved items have not been overwritten. Try refreshing once the API is available.</p></div>}
      {feedback && <p className="bucket-feedback" role="status">{feedback}</p>}
      {ready && items.length === 0 && legacy.items.length > 0 && legacy.writable && <section className="bucket-storage-alert"><strong>Your previous browser list is still here.</strong><p>Import those items into this shared space. The original local copy will remain untouched.</p><button type="button" className="btn btn-secondary" onClick={importLegacyItems} disabled={!writable}>Import {legacy.items.length} saved {legacy.items.length === 1 ? "dream" : "dreams"}</button></section>}
      {legacy.error && <p className="bucket-feedback" role="status">Your older browser list could not be read, so it has been left untouched.</p>}

      <section className="bucket-progress glass-card" aria-label="Bucket list progress">
        <div className="bucket-progress__top"><div><strong>{completed.length} of {items.length}</strong><span> dreams completed</span></div><strong>{progress}%</strong></div>
        <div className="bucket-progress__track" role="progressbar" aria-label="Completed bucket-list items" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="bucket-progress__fill" style={{ width: `${progress}%` }} /></div>
        <p className="bucket-progress__caption">{items.length === 0 ? "Every great story starts with a first idea." : progress === 100 ? "Look at you making things happen! ✨" : "Little by little, your list becomes your story."}</p>
      </section>

      {adding ? <section className="glass-card bucket-add-card" aria-label="Add a bucket-list item"><div className="bucket-add-card__heading"><h2>Add a little dream</h2><p>Big plans and tiny moments both belong here.</p></div><ItemForm draft={draft} setDraft={(next) => { setDraft(next); setFormError(""); }} submitLabel="Add to list" onCancel={() => { setAdding(false); setDraft(emptyDraft()); setFormError(""); }} onSubmit={addItem} formError={formError} /></section> : <button type="button" className="btn btn-primary bucket-add-trigger" onClick={() => { setAdding(true); setFeedback(""); }} disabled={!writable}><span aria-hidden="true">＋</span> Add something we want to do</button>}

      {loading ? <section className="bucket-empty glass-card"><h2>Loading your shared dreams…</h2><p>Getting the latest list for both of you.</p></section> : items.length === 0 ? (storageError ? null : <section className="bucket-empty glass-card"><span className="bucket-empty__illustration" aria-hidden="true">♡</span><h2>Your list is a blank page.</h2><p>Add the first thing you'd love to do together. It can be a big trip or a small Tuesday ritual.</p>{!adding && <button type="button" className="btn btn-secondary" onClick={() => setAdding(true)}>Write your first dream</button>}</section>) : <>
        <section className="bucket-section"><div className="bucket-section__heading"><h2>Still dreaming</h2><span>{pending.length}</span></div>{pending.length ? <ul className="bucket-items">{pending.map((item) => <BucketItem key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} onEdit={editItem} writable={writable} />)}</ul> : <div className="bucket-section__empty"><strong>Nothing left on the wish list.</strong><p>You've checked off every dream — add another when inspiration strikes.</p></div>}</section>
        {completed.length > 0 && <section className="bucket-section bucket-section--completed"><div className="bucket-section__heading"><h2>Made it happen</h2><span>{completed.length}</span></div><ul className="bucket-items">{completed.map((item) => <BucketItem key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} onEdit={editItem} writable={writable} />)}</ul></section>}
      </>}
    </div>
  );
}

export default BucketList;
