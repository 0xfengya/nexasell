-- ============================================================
--  NexaSell — Migration: tambah kolom username & shift
--  Jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS shift    TEXT DEFAULT 'pagi';
