-- Add 'user' role to profiles table check constraint and allow NULL for user_id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('owner', 'admin', 'staff', 'user'));
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;
