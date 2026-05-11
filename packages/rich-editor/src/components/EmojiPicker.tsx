import type { Editor } from "@tiptap/react";
import { Icon } from "@catylast/icons";
import type { IconName } from "@catylast/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@catylast/primitives";
import { useEffect, useMemo, useRef, useState } from "react";

import * as styles from "../Editor.css";

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter((c): c is string => Boolean(c)).join(" ");

type EmojiCategory = {
  id: string;
  label: string;
  icon: IconName;
  emojis: Array<{ emoji: string; name: string; keywords?: string[] }>;
};

// Curated set of common emojis grouped by category. Avoids a heavy dependency
// for v1 while still covering the everyday picks.
const CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "smile",
    emojis: [
      { emoji: "😀", name: "grinning" },
      { emoji: "😃", name: "smiley" },
      { emoji: "😄", name: "smile" },
      { emoji: "😁", name: "grin" },
      { emoji: "😆", name: "laughing" },
      { emoji: "😅", name: "sweat smile" },
      { emoji: "🤣", name: "rofl" },
      { emoji: "😂", name: "joy" },
      { emoji: "🙂", name: "slight smile" },
      { emoji: "🙃", name: "upside down" },
      { emoji: "😉", name: "wink" },
      { emoji: "😊", name: "blush" },
      { emoji: "😇", name: "innocent" },
      { emoji: "😍", name: "heart eyes" },
      { emoji: "🤩", name: "star struck" },
      { emoji: "😘", name: "kiss" },
      { emoji: "😎", name: "cool" },
      { emoji: "🤓", name: "nerd" },
      { emoji: "🧐", name: "monocle" },
      { emoji: "🤔", name: "thinking" },
      { emoji: "😐", name: "neutral" },
      { emoji: "😑", name: "expressionless" },
      { emoji: "😶", name: "no mouth" },
      { emoji: "🙄", name: "eye roll" },
      { emoji: "😏", name: "smirk" },
      { emoji: "😣", name: "persevere" },
      { emoji: "😥", name: "disappointed" },
      { emoji: "😮", name: "open mouth" },
      { emoji: "🤐", name: "zipper mouth" },
      { emoji: "😯", name: "hushed" },
      { emoji: "😴", name: "sleeping" },
      { emoji: "🤤", name: "drooling" },
      { emoji: "😪", name: "sleepy" },
      { emoji: "😢", name: "cry" },
      { emoji: "😭", name: "sob" },
      { emoji: "😤", name: "triumph" },
      { emoji: "😡", name: "rage" },
      { emoji: "🤯", name: "exploding head" },
      { emoji: "🥳", name: "party" },
      { emoji: "🥺", name: "pleading" },
    ],
  },
  {
    id: "people",
    label: "People",
    icon: "user",
    emojis: [
      { emoji: "👍", name: "thumbs up" },
      { emoji: "👎", name: "thumbs down" },
      { emoji: "👌", name: "ok" },
      { emoji: "✌️", name: "victory" },
      { emoji: "🤞", name: "fingers crossed" },
      { emoji: "🤟", name: "love you" },
      { emoji: "🤘", name: "rock on" },
      { emoji: "👏", name: "clap" },
      { emoji: "🙌", name: "raised hands" },
      { emoji: "👐", name: "open hands" },
      { emoji: "🤝", name: "handshake" },
      { emoji: "🙏", name: "pray" },
      { emoji: "💪", name: "muscle" },
      { emoji: "👋", name: "wave" },
      { emoji: "👀", name: "eyes" },
      { emoji: "🧠", name: "brain" },
      { emoji: "👶", name: "baby" },
      { emoji: "🧑", name: "person" },
      { emoji: "👩", name: "woman" },
      { emoji: "👨", name: "man" },
    ],
  },
  {
    id: "objects",
    label: "Objects",
    icon: "box",
    emojis: [
      { emoji: "💡", name: "idea" },
      { emoji: "🔑", name: "key" },
      { emoji: "🔒", name: "lock" },
      { emoji: "🔓", name: "unlock" },
      { emoji: "📌", name: "pin" },
      { emoji: "📎", name: "paperclip" },
      { emoji: "✂️", name: "scissors" },
      { emoji: "📁", name: "folder" },
      { emoji: "📂", name: "open folder" },
      { emoji: "🗂️", name: "card index" },
      { emoji: "📅", name: "calendar" },
      { emoji: "📆", name: "tear off calendar" },
      { emoji: "📊", name: "bar chart" },
      { emoji: "📈", name: "chart up" },
      { emoji: "📉", name: "chart down" },
      { emoji: "💻", name: "laptop" },
      { emoji: "🖥️", name: "desktop" },
      { emoji: "⌨️", name: "keyboard" },
      { emoji: "🖱️", name: "mouse" },
      { emoji: "💾", name: "disk" },
      { emoji: "💿", name: "cd" },
      { emoji: "📱", name: "phone" },
      { emoji: "🔋", name: "battery" },
      { emoji: "🔌", name: "plug" },
      { emoji: "💰", name: "money bag" },
      { emoji: "💳", name: "credit card" },
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: "hash",
    emojis: [
      { emoji: "❤️", name: "heart" },
      { emoji: "🧡", name: "orange heart" },
      { emoji: "💛", name: "yellow heart" },
      { emoji: "💚", name: "green heart" },
      { emoji: "💙", name: "blue heart" },
      { emoji: "💜", name: "purple heart" },
      { emoji: "🖤", name: "black heart" },
      { emoji: "🤍", name: "white heart" },
      { emoji: "💔", name: "broken heart" },
      { emoji: "💯", name: "hundred" },
      { emoji: "✅", name: "check" },
      { emoji: "❌", name: "cross" },
      { emoji: "⚠️", name: "warning" },
      { emoji: "🚫", name: "prohibited" },
      { emoji: "❓", name: "question" },
      { emoji: "❗", name: "exclamation" },
      { emoji: "‼️", name: "double exclamation" },
      { emoji: "⭐", name: "star" },
      { emoji: "🌟", name: "glowing star" },
      { emoji: "✨", name: "sparkles" },
      { emoji: "🔥", name: "fire" },
      { emoji: "💥", name: "boom" },
      { emoji: "💢", name: "anger" },
      { emoji: "💤", name: "zzz" },
    ],
  },
  {
    id: "nature",
    label: "Nature",
    icon: "trophy",
    emojis: [
      { emoji: "🌱", name: "seedling" },
      { emoji: "🌲", name: "evergreen" },
      { emoji: "🌳", name: "tree" },
      { emoji: "🌴", name: "palm" },
      { emoji: "🌵", name: "cactus" },
      { emoji: "🌷", name: "tulip" },
      { emoji: "🌸", name: "cherry blossom" },
      { emoji: "🌹", name: "rose" },
      { emoji: "🌻", name: "sunflower" },
      { emoji: "🌼", name: "blossom" },
      { emoji: "🌎", name: "earth" },
      { emoji: "🌙", name: "moon" },
      { emoji: "☀️", name: "sun" },
      { emoji: "⛅", name: "cloud" },
      { emoji: "🌧️", name: "rain" },
      { emoji: "⚡", name: "bolt" },
      { emoji: "❄️", name: "snowflake" },
      { emoji: "🐶", name: "dog" },
      { emoji: "🐱", name: "cat" },
      { emoji: "🦊", name: "fox" },
      { emoji: "🐻", name: "bear" },
      { emoji: "🐼", name: "panda" },
      { emoji: "🦁", name: "lion" },
      { emoji: "🐯", name: "tiger" },
    ],
  },
];

export type EmojiPickerProps = {
  editor: Editor;
};

export function EmojiPicker({ editor }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]!.id);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      const matches: Array<{ emoji: string; name: string }> = [];
      for (const cat of CATEGORIES) {
        for (const e of cat.emojis) {
          const haystack = [e.name, ...(e.keywords ?? [])].join(" ");
          if (haystack.includes(q)) matches.push(e);
        }
      }
      return matches;
    }
    const cat = CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0]!;
    return cat.emojis;
  }, [query, activeCategory]);

  const insertEmoji = (emoji: string) => {
    setOpen(false);
    setQuery("");
    editor.chain().focus().insertContent(emoji).run();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cx(styles.toolbarButton, open && styles.toolbarButtonActive)}
          aria-label="Insert emoji"
          title="Insert emoji"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Icon name="smile" size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className={styles.emojiPicker}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className={styles.insertSearchRow}>
          <Icon
            name="search"
            size={14}
            className={styles.insertSearchIcon}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emoji"
            className={styles.insertSearchInput}
            aria-label="Search emoji"
          />
        </div>

        {!query && (
          <div className={styles.emojiTabs} role="tablist">
            {CATEGORIES.map((cat) => {
              const active = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={cx(
                    styles.emojiTab,
                    active && styles.emojiTabActive,
                  )}
                  onClick={() => setActiveCategory(cat.id)}
                  aria-selected={active}
                  role="tab"
                  title={cat.label}
                >
                  <Icon name={cat.icon} size={14} />
                </button>
              );
            })}
          </div>
        )}

        {visible.length === 0 ? (
          <div className={styles.insertEmpty}>
            No emoji match &ldquo;{query}&rdquo;
          </div>
        ) : (
          <div className={styles.emojiGrid}>
            {visible.map((e) => (
              <button
                key={`${e.emoji}-${e.name}`}
                type="button"
                className={styles.emojiCell}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => insertEmoji(e.emoji)}
                title={e.name}
                aria-label={e.name}
              >
                {e.emoji}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
