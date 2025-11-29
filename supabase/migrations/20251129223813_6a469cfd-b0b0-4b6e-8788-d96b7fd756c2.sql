-- Add realistic Saudi Arabian profile avatars
-- Update existing profiles with avatar URLs and Saudi names

DO $$
DECLARE
  saudi_profiles UUID[];
  profile_record RECORD;
  counter INT := 0;
BEGIN
  -- Get all existing profiles
  FOR profile_record IN 
    SELECT id FROM profiles ORDER BY created_at LIMIT 10
  LOOP
    counter := counter + 1;
    
    -- Update with Saudi names and diverse avatar images
    CASE counter
      WHEN 1 THEN
        UPDATE profiles 
        SET 
          full_name = 'Mohammed Al-Rashid',
          avatar_url = 'https://i.pravatar.cc/150?img=12'
        WHERE id = profile_record.id;
      
      WHEN 2 THEN
        UPDATE profiles 
        SET 
          full_name = 'Fatima Al-Saud',
          avatar_url = 'https://i.pravatar.cc/150?img=47'
        WHERE id = profile_record.id;
      
      WHEN 3 THEN
        UPDATE profiles 
        SET 
          full_name = 'Abdullah Al-Otaibi',
          avatar_url = 'https://i.pravatar.cc/150?img=33'
        WHERE id = profile_record.id;
      
      WHEN 4 THEN
        UPDATE profiles 
        SET 
          full_name = 'Sara Al-Ghamdi',
          avatar_url = 'https://i.pravatar.cc/150?img=45'
        WHERE id = profile_record.id;
      
      WHEN 5 THEN
        UPDATE profiles 
        SET 
          full_name = 'Ahmed Al-Harbi',
          avatar_url = 'https://i.pravatar.cc/150?img=68'
        WHERE id = profile_record.id;
      
      WHEN 6 THEN
        UPDATE profiles 
        SET 
          full_name = 'Noura Al-Zahrani',
          avatar_url = 'https://i.pravatar.cc/150?img=48'
        WHERE id = profile_record.id;
      
      WHEN 7 THEN
        UPDATE profiles 
        SET 
          full_name = 'Khalid Al-Dosari',
          avatar_url = 'https://i.pravatar.cc/150?img=59'
        WHERE id = profile_record.id;
      
      WHEN 8 THEN
        UPDATE profiles 
        SET 
          full_name = 'Layla Al-Maliki',
          avatar_url = 'https://i.pravatar.cc/150?img=44'
        WHERE id = profile_record.id;
      
      WHEN 9 THEN
        UPDATE profiles 
        SET 
          full_name = 'Omar Al-Shehri',
          avatar_url = 'https://i.pravatar.cc/150?img=14'
        WHERE id = profile_record.id;
      
      WHEN 10 THEN
        UPDATE profiles 
        SET 
          full_name = 'Hanan Al-Qahtani',
          avatar_url = 'https://i.pravatar.cc/150?img=43'
        WHERE id = profile_record.id;
    END CASE;
  END LOOP;
END $$;