-- Add display_id field for short numeric IDs like Jira Align uses
ALTER TABLE features ADD COLUMN IF NOT EXISTS display_id TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_features_display_id ON features(display_id);

-- Update existing features with short numeric display IDs
UPDATE features SET display_id = 
  CASE name
    WHEN 'User Authentication' THEN '2625'
    WHEN 'Payment Gateway' THEN '5387'
    WHEN 'User Dashboard' THEN '4096'
    WHEN 'Reports Engine' THEN '4210'
    WHEN 'API Integration' THEN '2461'
    WHEN 'Data Migration' THEN '4209'
    WHEN 'Profile Management' THEN '4274'
    WHEN 'Settings Page' THEN '136'
    WHEN 'Admin Console' THEN '2928'
    WHEN 'Email Service' THEN '4207'
    WHEN 'Notification System' THEN '3422'
    WHEN 'Audit Trail' THEN '3973'
    WHEN 'Widget Library' THEN '1083'
    WHEN 'Chart Builder' THEN '3347'
    WHEN 'File Upload' THEN '1336'
    WHEN 'Data Visualization' THEN '3864'
    WHEN 'Search Feature' THEN '4200'
    WHEN 'Export Functionality' THEN '4201'
    WHEN 'Mobile Responsive' THEN '4202'
    WHEN 'Image Processing' THEN '4032'
    WHEN 'PDF Generation' THEN '4033'
    WHEN 'Batch Processing' THEN '1641'
    WHEN 'Analytics Dashboard' THEN '3890'
    WHEN 'Dashboard Widgets' THEN '3960'
    WHEN 'Real-time Sync' THEN '3431'
    WHEN 'Collaboration Tools' THEN '5393'
    WHEN 'Video Processing' THEN '3957'
    WHEN 'Content Management' THEN '3927'
    WHEN 'Workflow Engine' THEN '3489'
    WHEN 'Integration Hub' THEN '4072'
    ELSE LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0')
  END
WHERE display_id IS NULL;