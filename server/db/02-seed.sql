INSERT INTO products (sku, name, category, volume_ml, units_per_case, case_price, stock_cases, image_url, color, coming_soon) VALUES
  ('NXT-W250',   'Nxtsip Water 250 ml',    'water', 250,   48, 28800, 1200, '/products/water-250ml.webp', NULL,      FALSE),
  ('NXT-W500',   'Nxtsip Water 500 ml',    'water', 500,   24, 24000, 2000, '/products/water-500ml.webp', NULL,      FALSE),
  ('NXT-W1000',  'Nxtsip Water 1 L',       'water', 1000,  12, 24000, 1500, '/products/water-1l.webp',    NULL,      FALSE),
  ('NXT-W2000',  'Nxtsip Water 2 L',       'water', 2000,  6,  18000, 40,   '/products/water-2l.webp',    NULL,      FALSE),
  ('NXT-JAR20',  'Nxtsip Water 20 L Jar',  'water', 20000, 1,  9000,  300,  '/products/water-20l.webp',   NULL,      FALSE),
  ('NXT-GL750',  'Nxtsip Glass Bottle 750 ml', 'water', 750, 1, 5000,  0,    NULL,                         NULL,      TRUE),
  ('NXT-S-LIME', 'Nxtsip Soda Lime Mint',  'soda',  330,   24, 72000, 0,    NULL,                         '#16b8f3', TRUE),
  ('NXT-S-COLA', 'Nxtsip Soda Cola',       'soda',  330,   24, 72000, 0,    NULL,                         '#0b3fae', TRUE),
  ('NXT-S-ORNG', 'Nxtsip Soda Orange',     'soda',  330,   24, 72000, 0,    NULL,                         '#ff8a1f', TRUE);

INSERT INTO price_tiers (min_cases, discount_bps) VALUES
  (20, 600),
  (50, 1200),
  (100, 2000);

-- Delivery and payment defaults are placeholders: set your own in the admin panel (Settings).
INSERT INTO settings (name, value) VALUES
  ('contact_email',      'orders@nxtsip.example'),
  ('contact_phone',      '+91 00000 00000'),
  ('whatsapp',           ''),
  ('announcement',       'Free delivery on orders over ₹1,500 · Wholesale discounts from 20 cases'),
  ('delivery_fee',       '9900'),
  ('free_delivery_from', '150000'),
  ('delivery_note',      'Delivered in 1–3 working days.'),
  ('cod_enabled',        'true'),
  ('online_enabled',     'true');
