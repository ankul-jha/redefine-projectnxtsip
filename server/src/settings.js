// Store settings are name/value rows of text; each key here maps to a row and says how to read it.
const SETTINGS = {
  contactEmail: { name: 'contact_email', type: 'text' },
  contactPhone: { name: 'contact_phone', type: 'text' },
  whatsapp: { name: 'whatsapp', type: 'text' },
  announcement: { name: 'announcement', type: 'text' },
  deliveryFee: { name: 'delivery_fee', type: 'number' },
  freeDeliveryFrom: { name: 'free_delivery_from', type: 'number' },
  deliveryNote: { name: 'delivery_note', type: 'text' },
  codEnabled: { name: 'cod_enabled', type: 'boolean' },
  onlineEnabled: { name: 'online_enabled', type: 'boolean' },
};

const CONTENT = 'content';

const read = {
  text: (value) => value ?? '',
  number: (value) => Number(value ?? 0),
  boolean: (value) => value === 'true',
};

export async function loadSettings(db) {
  const [rows] = await db.query('SELECT name, value FROM settings WHERE name IN (?)', [
    Object.values(SETTINGS).map((setting) => setting.name),
  ]);
  const values = new Map(rows.map((row) => [row.name, row.value]));
  return Object.fromEntries(
    Object.entries(SETTINGS).map(([key, { name, type }]) => [key, read[type](values.get(name))]),
  );
}

export async function saveSettings(db, settings) {
  await db.query(
    'INSERT INTO settings (name, value) VALUES ? AS new ON DUPLICATE KEY UPDATE value = new.value',
    [Object.entries(SETTINGS).map(([key, { name }]) => [name, String(settings[key])])],
  );
}

// The landing page copy edited in the admin panel, as one JSON document. Null until it is first saved, in which
// case the store shows the copy it ships with.
export async function loadContent(db) {
  const [[row]] = await db.query('SELECT value FROM settings WHERE name = ?', [CONTENT]);
  return row ? JSON.parse(row.value) : null;
}

export async function saveContent(db, content) {
  await db.query('INSERT INTO settings (name, value) VALUES (?, ?) AS new ON DUPLICATE KEY UPDATE value = new.value', [
    CONTENT,
    JSON.stringify(content),
  ]);
}
