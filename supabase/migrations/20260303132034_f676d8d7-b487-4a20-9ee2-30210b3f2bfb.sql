-- 1. Add DELETE policy on profiles table
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- 2. Harden handle_new_user() with input validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  safe_name TEXT;
BEGIN
  safe_name := COALESCE(
    SUBSTRING(NEW.raw_user_meta_data->>'full_name' FROM 1 FOR 255),
    ''
  );
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, safe_name);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;