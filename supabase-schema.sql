-- 1% OS Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SETTINGS
CREATE TABLE public.settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, key)
);

-- 2. FITNESS
CREATE TABLE public.fitness (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    weight NUMERIC,
    body_fat NUMERIC,
    waist NUMERIC,
    calories INTEGER,
    protein INTEGER,
    water INTEGER,
    steps INTEGER,
    gym_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, date)
);

-- 3. WORKOUTS
CREATE TABLE public.workouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    exercises JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. DISCIPLINE LOGS
CREATE TABLE public.discipline_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    score INTEGER DEFAULT 0,
    completed_habits JSONB DEFAULT '{}'::jsonb,
    is_elite BOOLEAN DEFAULT false,
    UNIQUE(user_id, date)
);

-- 5. HARD THINGS
CREATE TABLE public.hard_things (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    notes TEXT,
    UNIQUE(user_id, date)
);

-- 6. GROWTH LOGS
CREATE TABLE public.growth_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    hours NUMERIC NOT NULL,
    notes TEXT
);

-- 7. GOALS
CREATE TABLE public.goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    deadline DATE,
    sort_order INTEGER DEFAULT 0
);

-- 8. TASKS
CREATE TABLE public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    category TEXT,
    sort_order INTEGER DEFAULT 0
);

-- 9. EXPENSES
CREATE TABLE public.expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    note TEXT
);

-- 10. REVIEWS
CREATE TABLE public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    UNIQUE(user_id, date, type)
);

-- 11. SKINCARE STEPS
CREATE TABLE public.skincare_steps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    routine_type TEXT NOT NULL,
    name TEXT NOT NULL,
    product TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- 12. SKINCARE LOGS
CREATE TABLE public.skincare_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    routine_type TEXT NOT NULL,
    completed JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, date, routine_type)
);

-- 13. HAIRCARE STEPS
CREATE TABLE public.haircare_steps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    routine_type TEXT NOT NULL,
    name TEXT NOT NULL,
    schedule TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- 14. HAIRCARE LOGS
CREATE TABLE public.haircare_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    routine_type TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    UNIQUE(user_id, date, routine_type)
);

-- 15. FUTURE SELF
CREATE TABLE public.future_self (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 16. WINS
CREATE TABLE public.wins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access their own data
-- ==========================================

-- Array of all tables
DO $$ 
DECLARE
  t text;
  tables text[] := ARRAY[
    'settings', 'fitness', 'workouts', 'discipline_logs', 
    'hard_things', 'growth_logs', 'goals', 'tasks', 
    'expenses', 'reviews', 'skincare_steps', 'skincare_logs', 
    'haircare_steps', 'haircare_logs', 'future_self', 'wins'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    
    EXECUTE format('
        CREATE POLICY "Users can only view their own %I"
        ON public.%I FOR SELECT
        USING (auth.uid() = user_id);
    ', t, t);

    EXECUTE format('
        CREATE POLICY "Users can only insert their own %I"
        ON public.%I FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    ', t, t);

    EXECUTE format('
        CREATE POLICY "Users can only update their own %I"
        ON public.%I FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    ', t, t);

    EXECUTE format('
        CREATE POLICY "Users can only delete their own %I"
        ON public.%I FOR DELETE
        USING (auth.uid() = user_id);
    ', t, t);
  END LOOP;
END $$;
