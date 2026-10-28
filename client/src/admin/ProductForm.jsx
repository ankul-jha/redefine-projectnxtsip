import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { adminApi } from './api.js';
import styles from './admin.module.css';
import { useSession } from './session.jsx';

const EMPTY = {
  sku: '',
  name: '',
  category: 'water',
  volumeMl: '',
  unitsPerCase: '',
  price: '',
  stock: '0',
  imageUrl: '',
  color: '',
  isActive: true,
  comingSoon: false,
};

const toForm = (product) => ({
  ...product,
  volumeMl: String(product.volumeMl),
  unitsPerCase: String(product.unitsPerCase),
  price: (product.casePrice / 100).toString(),
  stock: String(product.stock),
});

const toProduct = (form) => ({
  sku: form.sku,
  name: form.name,
  category: form.category,
  volumeMl: Number(form.volumeMl),
  unitsPerCase: Number(form.unitsPerCase),
  casePrice: Math.round(Number(form.price) * 100),
  stock: Number(form.stock),
  imageUrl: form.imageUrl,
  color: form.color,
  isActive: form.isActive,
  comingSoon: form.comingSoon,
});

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { expire } = useSession();
  const [form, setForm] = useState(id ? null : EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminApi.products().then(
      (products) => {
        const product = products.find((item) => String(item.id) === id);
        if (product) setForm(toForm(product));
        else setMessage('Product not found');
      },
      (error) => (error.status === 401 ? expire() : setMessage(error.message)),
    );
  }, [id, expire]);

  const update = (event) => {
    const { name, type, value, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  async function upload(event) {
    const input = event.target;
    if (!input.files[0]) return;
    setUploading(true);
    setErrors((current) => ({ ...current, imageUrl: undefined }));
    try {
      const { url } = await adminApi.uploadImage(input.files[0]);
      setForm((current) => ({ ...current, imageUrl: url }));
    } catch (error) {
      if (error.status === 401) return expire();
      setErrors((current) => ({ ...current, imageUrl: error.message }));
    } finally {
      setUploading(false);
      input.value = '';
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const product = toProduct(form);
      if (id) await adminApi.updateProduct(id, product);
      else await adminApi.createProduct(product);
      navigate('/admin/products');
    } catch (error) {
      if (error.status === 401) return expire();
      const fields = error.details?.fields ?? {};
      setErrors({ ...fields, price: fields.casePrice });
      setMessage(error.message);
      setSaving(false);
    }
  }

  const field = (name, label, props = {}) => (
    <div className="field">
      <label htmlFor={`product-${name}`}>{label}</label>
      <input
        id={`product-${name}`}
        name={name}
        value={form[name]}
        onChange={update}
        aria-invalid={Boolean(errors[name])}
        {...props}
      />
      {errors[name] && <p className="field-error">{errors[name]}</p>}
    </div>
  );

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <Link to="/admin/products" className={styles.back}>
            ← Products
          </Link>
          <h1>{id ? 'Edit product' : 'Add product'}</h1>
        </div>
      </header>
      {message && <p className="alert alert--error">{message}</p>}
      {form && (
        <form className={`${styles.panel} ${styles.form}`} onSubmit={handleSubmit} noValidate>
          {field('name', 'Name', { required: true })}
          {field('sku', 'SKU', { required: true })}
          <div className="field">
            <label htmlFor="product-category">Category</label>
            <select id="product-category" name="category" value={form.category} onChange={update}>
              <option value="water">Water</option>
              <option value="soda">Soda</option>
            </select>
          </div>
          {field('volumeMl', 'Volume (ml)', { type: 'number', min: 1, inputMode: 'numeric' })}
          {field('unitsPerCase', 'Units per case', { type: 'number', min: 1, inputMode: 'numeric' })}
          {field('price', 'Case price (₹)', { type: 'number', min: 0, step: '0.01', inputMode: 'decimal' })}
          {field('stock', 'Stock (cases)', { type: 'number', min: 0, inputMode: 'numeric' })}
          <div className={`field ${styles.wide}`}>
            <label htmlFor="product-photo">Photo</label>
            <div className={styles.photoRow}>
              {form.imageUrl && <img className={styles.photoPreview} src={form.imageUrl} alt="" />}
              <div className={styles.photoControls}>
                <input
                  id="product-photo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={upload}
                  disabled={uploading}
                />
                <p className={styles.muted}>
                  {uploading ? 'Uploading…' : 'PNG, JPEG or WebP, up to 2 MB. Portrait photos (5:6) fit the shop best.'}
                </p>
                <input
                  name="imageUrl"
                  value={form.imageUrl}
                  onChange={update}
                  placeholder="Or paste a link: https://… or /products/…"
                  aria-label="Photo link"
                />
                {form.imageUrl && (
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setForm((current) => ({ ...current, imageUrl: '' }))}
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
            {errors.imageUrl && <p className="field-error">{errors.imageUrl}</p>}
          </div>
          <div className="field">
            <label htmlFor="product-color">Colour (optional, used for soda cans)</label>
            <div className={styles.colorRow}>
              <input
                type="color"
                value={form.color || '#3b94ea'}
                onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                aria-label="Pick colour"
              />
              <input id="product-color" name="color" value={form.color} onChange={update} placeholder="#16b8f3" />
            </div>
            {errors.color && <p className="field-error">{errors.color}</p>}
          </div>
          <label className={styles.check}>
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={update} />
            Show on the website
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="comingSoon" checked={form.comingSoon} onChange={update} />
            Coming soon (visible, but can't be ordered)
          </label>
          <div className={styles.formActions}>
            <button type="submit" className="button" disabled={saving}>
              {saving ? 'Saving…' : 'Save product'}
            </button>
            <Link to="/admin/products" className="button button--secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </>
  );
}
