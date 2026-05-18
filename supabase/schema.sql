-- ============================================================
--  NexaSell — Supabase Schema
--  Jalankan file ini di Supabase SQL Editor (Project → SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUM TYPES ──────────────────────────────────────────────
CREATE TYPE user_role    AS ENUM ('admin', 'cashier');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'cancelled', 'refunded');
CREATE TYPE pay_method   AS ENUM ('bank_transfer', 'ewallet', 'qris', 'credit_card', 'cod', 'cash', 'card');
CREATE TYPE pay_status   AS ENUM ('pending', 'success', 'failed', 'expired');

-- ─── PROFILES (extends Supabase Auth users) ──────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role    NOT NULL DEFAULT 'cashier',
  full_name   TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── PRODUCTS ────────────────────────────────────────────────
CREATE TABLE products (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT         NOT NULL,
  price          INTEGER      NOT NULL CHECK (price >= 0),
  original_price INTEGER               CHECK (original_price >= 0),
  category       TEXT         NOT NULL,
  image_url      TEXT,
  description    TEXT,
  stock          INTEGER      NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sold           INTEGER      NOT NULL DEFAULT 0,
  rating         NUMERIC(3,1)          DEFAULT 0.0,
  badge          TEXT,                 -- "Best Seller" | "Sale" | "New" | NULL
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── ORDERS ──────────────────────────────────────────────────
CREATE TABLE orders (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number    TEXT         NOT NULL UNIQUE,   -- e.g. "NXS-20240418-001"
  customer_name   TEXT         NOT NULL,
  customer_email  TEXT,
  customer_phone  TEXT,
  customer_address TEXT,
  notes           TEXT,
  subtotal        INTEGER      NOT NULL,
  shipping_cost   INTEGER      NOT NULL DEFAULT 0,
  total           INTEGER      NOT NULL,
  status          order_status NOT NULL DEFAULT 'pending',
  pay_method      pay_method,
  pay_status      pay_status   NOT NULL DEFAULT 'pending',
  snap_token      TEXT,                           -- Midtrans snap token
  payment_url     TEXT,                           -- Midtrans redirect url
  midtrans_order_id TEXT,                         -- ID dikirim ke Midtrans
  cashier_id      UUID         REFERENCES profiles(id),
  source          TEXT         NOT NULL DEFAULT 'online', -- 'online' | 'pos'
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── ORDER ITEMS ─────────────────────────────────────────────
CREATE TABLE order_items (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID    REFERENCES products(id) ON DELETE SET NULL,
  name        TEXT    NOT NULL,   -- snapshot nama saat order
  price       INTEGER NOT NULL,   -- snapshot harga saat order
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  subtotal    INTEGER NOT NULL,
  image_url   TEXT
);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX idx_products_category  ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_cashier     ON orders(cashier_id);
CREATE INDEX idx_orders_created     ON orders(created_at DESC);
CREATE INDEX idx_order_items_order  ON order_items(order_id);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Profiles: user bisa baca/update milik sendiri; admin bisa baca semua
CREATE POLICY "profiles_self" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Products: public bisa READ; admin bisa ALL
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "products_admin_all" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Orders: cashier bisa baca order miliknya; admin bisa ALL; user bisa baca miliknya
CREATE POLICY "orders_cashier_own" ON orders
  FOR ALL USING (
    cashier_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role bypass (untuk API routes dengan service key)
-- Semua CRUD dari server-side menggunakan supabaseAdmin (service role) yang bypass RLS

-- ─── SEED: PRODUCTS ──────────────────────────────────────────
INSERT INTO products (name, price, original_price, category, image_url, description, stock, sold, rating, badge) VALUES
('Americano Coffee',   28000, NULL,    'food',        'https://images.unsplash.com/photo-1521302080334-4bebac2763a6?w=400&q=80', 'Rich espresso diluted with hot water. Bold and smooth flavor.',                              50, 234, 4.8, 'Best Seller'),
('Matcha Latte',       35000, NULL,    'food',        'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&q=80', 'Premium matcha powder blended with steamed milk for a creamy, earthy taste.',                40, 189, 4.7, NULL),
('Wireless Earbuds',  450000, 599000, 'electronics', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80', 'Active noise cancelling with 30hr battery life and premium sound quality.',                  15,  87, 4.9, 'Sale'),
('Smart Watch S5',   1250000,1500000, 'electronics', 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&q=80', 'Health tracking, GPS, and 7-day battery with beautiful AMOLED display.',                     8,  56, 4.6, 'Sale'),
('Oversized Tee',      85000, NULL,   'fashion',     'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80', 'Premium cotton oversized t-shirt in neutral tones.',                                         60, 312, 4.5, 'New'),
('Cargo Pants',       195000, NULL,   'fashion',     'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80', 'Relaxed fit cargo pants with multiple pockets.',                                             30, 145, 4.4, NULL),
('Vitamin C Serum',   120000, NULL,   'beauty',      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80', 'Brightening serum with 20% Vitamin C for radiant, even-toned skin.',                       25, 278, 4.8, 'Best Seller'),
('Lip Tint Set',       75000, NULL,   'beauty',      'https://images.unsplash.com/photo-1586495777744-4e6232bf2ebb?w=400&q=80', 'Set of 4 long-lasting lip tints in trendy Korean-inspired shades.',                         45, 201, 4.6, NULL),
('Ceramic Plant Pot',  65000, NULL,   'home',        'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&q=80', 'Minimalist ceramic pot perfect for indoor plants and home decoration.',                     20,  93, 4.5, NULL),
('LED Desk Lamp',     185000, NULL,   'home',        'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80', 'Eye-care LED lamp with adjustable color temperature and brightness.',                       12,  67, 4.7, NULL),
('Yoga Mat Premium',  250000, 320000, 'sports',      'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400&q=80', 'Non-slip 6mm thick yoga mat with carry strap.',                                             18, 134, 4.8, 'Sale'),
('Protein Shaker',     55000, NULL,   'sports',      'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&q=80', 'BPA-free 700ml shaker bottle with stainless mixing ball.',                                  35, 189, 4.3, NULL),
('Croissant Butter',   22000, NULL,   'food',        'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80', 'Freshly baked butter croissant – flaky, golden, and absolutely delicious.',                 30, 445, 4.9, 'Best Seller'),
('USB-C Hub 7-in-1',  320000, NULL,  'electronics', 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400&q=80', '7-port USB-C hub with 4K HDMI, SD card reader, and 100W PD charging.',                    22,  78, 4.6, 'New'),
('Tote Bag Canvas',    95000, NULL,  'fashion',     'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400&q=80', 'Heavy-duty canvas tote bag with inner zip pocket.',                                        50, 267, 4.5, NULL),
('Face Wash Gentle',   89000, NULL,  'beauty',      'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80', 'Gentle foam cleanser with ceramides and hyaluronic acid for all skin types.',               40, 223, 4.7, NULL);

-- ─── RPC: DECREMENT STOCK ────────────────────────────────────
-- Dipanggil dari /api/orders saat order dibuat
-- Atomic: stock tidak bisa minus, sold selalu naik
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_qty INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET
    stock = GREATEST(0, stock - p_qty),
    sold  = sold + p_qty
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
