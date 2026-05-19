-- ─────────────────────────────────────────────────────────────────
--  JALANKAN INI DI SUPABASE SQL EDITOR
--  Fix: RLS policies yang hilang untuk order_items
-- ─────────────────────────────────────────────────────────────────

-- 1. order_items: admin bisa baca semua
DROP POLICY IF EXISTS "order_items_admin_all" ON order_items;
CREATE POLICY "order_items_admin_all" ON order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Cashier bisa lihat order_items dari order miliknya
DROP POLICY IF EXISTS "order_items_cashier_own" ON order_items;
CREATE POLICY "order_items_cashier_own" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id AND orders.cashier_id = auth.uid()
    )
  );

-- 3. Public bisa INSERT order_items (order online dari customer)
DROP POLICY IF EXISTS "order_items_public_insert" ON order_items;
CREATE POLICY "order_items_public_insert" ON order_items
  FOR INSERT WITH CHECK (true);

-- 4. Order online bisa di-INSERT tanpa login
DROP POLICY IF EXISTS "orders_public_insert" ON orders;
CREATE POLICY "orders_public_insert" ON orders
  FOR INSERT WITH CHECK (source = 'online');
