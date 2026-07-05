-- CAT-DOCS-NOTION-20260704-001 — content_text for BlockNote pages.
--
-- update_kb_content_text() ran extract_kb_tiptap_text() on EVERY save, which
-- returns '' for BlockNote JSON — blanking content_text (and therefore the
-- search_vector body index) on all Docex pages. The app computes and sends
-- content_text (blocksToText) with every save, so for blocknote docs the
-- trigger must keep the client value and only run the tiptap extractor for
-- legacy ADF documents.

create or replace function public.update_kb_content_text()
returns trigger
language plpgsql
as $function$
begin
  if new.content_format = 'blocknote' then
    return new;
  end if;
  new.content_text := extract_kb_tiptap_text(new.content);
  return new;
end;
$function$;
