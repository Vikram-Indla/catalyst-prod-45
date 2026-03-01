-- Make Arabic columns nullable (English-only platform)
ALTER TABLE wiki_domains ALTER COLUMN name_ar DROP NOT NULL;
ALTER TABLE wiki_domains ALTER COLUMN description_ar DROP NOT NULL;