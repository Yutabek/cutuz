ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE public.barbers
SET status = 'pending'
WHERE status IS NULL OR TRIM(status) = '';

UPDATE public.barbers
SET status = 'pending'
WHERE status NOT IN ('pending', 'approved', 'rejected');

ALTER TABLE public.barbers
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.barbers
  DROP CONSTRAINT IF EXISTS barbers_status_check;

ALTER TABLE public.barbers
  ADD CONSTRAINT barbers_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 0;

ALTER TABLE public.barbers
  ALTER COLUMN is_active SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_barbers_status_active
  ON public.barbers(status, is_active);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS telegram_id BIGINT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_id
  ON public.users(telegram_id);

ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS telegram_id BIGINT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starting_price INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS services TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS location_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio TEXT,
  ADD COLUMN IF NOT EXISTS reviews TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_barbers_telegram_id
  ON public.barbers(telegram_id);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS telegram_user_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_username TEXT,
  ADD COLUMN IF NOT EXISTS barber_id BIGINT,
  ADD COLUMN IF NOT EXISTS barber_name TEXT,
  ADD COLUMN IF NOT EXISTS service TEXT,
  ADD COLUMN IF NOT EXISTS date TEXT,
  ADD COLUMN IF NOT EXISTS time TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS comment TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waiting_confirmation',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
