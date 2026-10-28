CREATE TABLE products (
  id             INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  sku            VARCHAR(32)       NOT NULL,
  name           VARCHAR(100)      NOT NULL,
  category       ENUM('water', 'soda') NOT NULL DEFAULT 'water',
  volume_ml      INT UNSIGNED      NOT NULL,
  units_per_case SMALLINT UNSIGNED NOT NULL,
  case_price     INT UNSIGNED      NOT NULL COMMENT 'Price per case in paise',
  stock_cases    INT UNSIGNED      NOT NULL DEFAULT 0,
  image_url      VARCHAR(500)      NULL,
  color          CHAR(7)           NULL COMMENT 'Hex accent, used for soda cans and product tiles',
  is_active      BOOLEAN           NOT NULL DEFAULT TRUE,
  coming_soon    BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_sku (sku)
);

CREATE TABLE price_tiers (
  min_cases    SMALLINT UNSIGNED NOT NULL,
  discount_bps SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (min_cases)
);

CREATE TABLE settings (
  name  VARCHAR(64) NOT NULL,
  value TEXT        NOT NULL,
  PRIMARY KEY (name)
);

CREATE TABLE coupons (
  code         VARCHAR(32)            NOT NULL,
  kind         ENUM('percent', 'flat') NOT NULL,
  value        INT UNSIGNED           NOT NULL COMMENT 'Basis points for percent, paise for flat',
  min_subtotal BIGINT UNSIGNED        NOT NULL DEFAULT 0 COMMENT 'Paise, after wholesale discount',
  max_uses     INT UNSIGNED           NULL,
  used_count   INT UNSIGNED           NOT NULL DEFAULT 0,
  expires_at   DATETIME               NULL,
  is_active    BOOLEAN                NOT NULL DEFAULT TRUE,
  created_at   DATETIME               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code)
);

CREATE TABLE images (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  mime_type  VARCHAR(32)  NOT NULL,
  data       MEDIUMBLOB   NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE customers (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email      VARCHAR(254) NOT NULL,
  name       VARCHAR(100) NOT NULL,
  company    VARCHAR(120) NULL,
  phone      VARCHAR(16)  NOT NULL,
  gstin      CHAR(15)     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_email (email)
);

CREATE TABLE orders (
  id                 INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  reference          CHAR(10)          NOT NULL,
  customer_id        INT UNSIGNED      NOT NULL,
  status             ENUM('awaiting_payment', 'placed', 'confirmed', 'dispatched', 'delivered', 'cancelled') NOT NULL DEFAULT 'placed',
  cases              INT UNSIGNED      NOT NULL,
  subtotal           BIGINT UNSIGNED   NOT NULL COMMENT 'Paise',
  discount_bps       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  discount           BIGINT UNSIGNED   NOT NULL DEFAULT 0 COMMENT 'Paise, wholesale',
  coupon_code        VARCHAR(32)       NULL,
  coupon_discount    BIGINT UNSIGNED   NOT NULL DEFAULT 0 COMMENT 'Paise',
  delivery_fee       INT UNSIGNED      NOT NULL DEFAULT 0 COMMENT 'Paise',
  total              BIGINT UNSIGNED   NOT NULL COMMENT 'Paise',
  payment_method     ENUM('cod', 'online') NOT NULL DEFAULT 'cod',
  payment_status     ENUM('pending', 'paid', 'refunded') NOT NULL DEFAULT 'pending',
  gateway_order_id   VARCHAR(64)       NULL COMMENT 'Razorpay order id',
  gateway_payment_id VARCHAR(64)       NULL COMMENT 'Razorpay payment id',
  paid_at            DATETIME          NULL,
  ship_address       VARCHAR(255)      NOT NULL,
  ship_city          VARCHAR(80)       NOT NULL,
  ship_pin           CHAR(6)           NOT NULL,
  created_at         DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_reference (reference),
  UNIQUE KEY uq_orders_gateway_order (gateway_order_id),
  KEY idx_orders_customer (customer_id),
  KEY idx_orders_status_created (status, created_at),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
);

CREATE TABLE order_items (
  order_id   INT UNSIGNED    NOT NULL,
  product_id INT UNSIGNED    NOT NULL,
  quantity   INT UNSIGNED    NOT NULL COMMENT 'Cases',
  case_price INT UNSIGNED    NOT NULL COMMENT 'Paise, captured at order time',
  line_total BIGINT UNSIGNED NOT NULL COMMENT 'Paise, before order discount',
  PRIMARY KEY (order_id, product_id),
  KEY idx_order_items_product (product_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (id)
);

CREATE TABLE waitlist (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email      VARCHAR(254) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_waitlist_email (email)
);

CREATE TABLE admin_users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(254) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_users_email (email)
);
