-- Jalankan sekali di Supabase SQL Editor
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS shift TEXT DEFAULT 'pagi';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notif_preferences JSONB DEFAULT '{}';