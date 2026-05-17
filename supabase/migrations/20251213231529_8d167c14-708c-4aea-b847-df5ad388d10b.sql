-- Add missing business roles to role_catalog (idempotent)
INSERT INTO public.role_catalog (code, name, sort_order, is_active)
VALUES
  ('PO',  'Product Owner', 10, true),
  ('BA',  'Business Analyst', 20, true),
  ('TPO', 'Technical Product Owner', 30, true),
  ('UX',  'UI/UX Designer', 40, true),
  ('PDM', 'Product Manager', 50, true),
  ('DM',  'Delivery Manager', 60, true),
  ('NET',   '.NET Developer', 70, true),
  ('BE',    'Backend Developer', 80, true),
  ('BE-L',  'Backend Lead', 90, true),
  ('DATA',  'Data Engineer', 100, true),
  ('DEVOPS','DevOps', 110, true),
  ('FE',    'Front-end Developer', 120, true),
  ('FE-L',  'Front-end Lead', 130, true),
  ('MOB',   'Mobile Developer', 140, true),
  ('MOB-L', 'Mobile Lead', 150, true),
  ('QA',    'QA Tester', 160, true),
  ('PM',    'Project Manager', 170, true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

-- Alter resource_inventory to reference role_catalog if not already
ALTER TABLE public.resource_inventory 
DROP CONSTRAINT IF EXISTS resource_inventory_role_code_fkey;

ALTER TABLE public.resource_inventory 
ADD CONSTRAINT resource_inventory_role_code_fkey 
FOREIGN KEY (role_code) REFERENCES public.role_catalog(code);

-- Add name unique constraint to resource_inventory if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resource_inventory_name_key'
  ) THEN
    ALTER TABLE public.resource_inventory ADD CONSTRAINT resource_inventory_name_key UNIQUE (name);
  END IF;
END $$;

-- Add name unique constraint to development_inventory if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'development_inventory_name_key'
  ) THEN
    ALTER TABLE public.development_inventory ADD CONSTRAINT development_inventory_name_key UNIQUE (name);
  END IF;
END $$;

-- Seed Resource Inventory (PO/BA/TPO list)
INSERT INTO public.resource_inventory (name, role_code, default_capacity_percent, is_active, updated_at)
VALUES
  ('Sulaiman Alessa', 'PO', 100, true, now()),
  ('Maali Alanazi', 'BA', 100, true, now()),
  ('Alaa Ali', 'PO', 100, true, now()),
  ('Khaled Alghithy', 'BA', 100, true, now()),
  ('Nora Alshahrani', 'BA', 100, true, now()),
  ('Fahad Almutairi', 'PO', 100, true, now()),
  ('Sara Almohammad', 'BA', 100, true, now()),
  ('Omar Alkhalid', 'PO', 100, true, now()),
  ('Ahmed Alharthi', 'TPO', 100, true, now()),
  ('Fatima Alzahrani', 'TPO', 100, true, now()),
  ('Hassan Almutairi', 'BA', 100, true, now()),
  ('Mona Alqahtani', 'TPO', 100, true, now())
ON CONFLICT (name) DO UPDATE
SET role_code = EXCLUDED.role_code,
    default_capacity_percent = EXCLUDED.default_capacity_percent,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Seed Development Inventory (project_id left NULL — projects table is empty on fresh install)
INSERT INTO public.development_inventory
  (name, role_code, project_id, start_date, end_date, capacity_percent, is_active, updated_at)
VALUES
  ('Hasan Elsherby', 'NET', NULL, null, null, 100, true, now()),
  ('Yousif Shalaby', 'NET', NULL, null, null, 100, true, now()),
  ('Mohammed Alaa', 'NET', NULL, null, null, 100, true, now()),
  ('Ahmed Yousry', 'NET', NULL, null, null, 100, true, now()),
  ('Ayaz Muhammad', 'BE', NULL, null, null, 100, true, now()),
  ('Mazen Yehia', 'BE', NULL, null, null, 100, true, now()),
  ('Raza Bangi', 'BE', NULL, null, null, 100, true, now()),
  ('Syed Habib', 'BE', NULL, null, null, 100, true, now()),
  ('Ubaid Nawab', 'BE', NULL, null, null, 100, true, now()),
  ('Waqas Ali', 'BE', NULL, null, null, 100, true, now()),
  ('Hassan Raza Hasrat', 'BE-L', NULL, null, null, 100, true, now()),
  ('Amadou Ndiaye', 'DATA', NULL, null, null, 100, true, now()),
  ('Maaz Majid', 'DATA', NULL, null, null, 100, true, now()),
  ('Arslan Malik', 'DEVOPS', NULL, null, null, 100, true, now()),
  ('Andrew Fayyaz', 'FE', NULL, null, null, 100, true, now()),
  ('Adnan Ali', 'FE', NULL, null, null, 100, true, now()),
  ('Divyam Kshatriya', 'FE', NULL, null, null, 100, true, now()),
  ('Menna Tula Nasser', 'FE', NULL, null, null, 100, true, now()),
  ('Sherif Gjini', 'FE', NULL, null, null, 100, true, now()),
  ('Waseem Ahmad', 'FE', NULL, null, null, 100, true, now()),
  ('Dreni Djini', 'FE-L', NULL, null, null, 100, true, now()),
  ('Imran Aslam', 'FE-L', NULL, null, null, 100, true, now()),
  ('Sikander Ahmad', 'MOB', NULL, null, null, 100, true, now()),
  ('Wahid Nasri', 'MOB-L', NULL, null, null, 100, true, now()),
  ('Muath Majed', 'PM', NULL, null, null, 100, true, now()),
  ('Abdulrahman Alghizzy', 'PM', NULL, null, null, 100, true, now()),
  ('Aya Ibrahims', 'QA', NULL, null, null, 100, true, now()),
  ('Nour Almani', 'QA', NULL, null, null, 100, true, now()),
  ('Yazeed Daraz', 'QA', NULL, null, null, 100, true, now()),
  ('Mahmoud Gameel', 'QA', NULL, null, null, 100, true, now()),
  ('Faisal Javed', 'TPO', NULL, null, null, 100, true, now()),
  ('Nada Alfassam', 'TPO', NULL, null, null, 100, true, now()),
  ('Vikram Indla', 'DM', NULL, null, null, 100, true, now())
ON CONFLICT (name) DO UPDATE
SET role_code = EXCLUDED.role_code,
    project_id = EXCLUDED.project_id,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    capacity_percent = EXCLUDED.capacity_percent,
    is_active = EXCLUDED.is_active,
    updated_at = now();