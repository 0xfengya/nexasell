-- ============================================================
--  NexaSell — Migration: tambah kolom notif_preferences
--  Jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notif_preferences JSONB DEFAULT '{}';
