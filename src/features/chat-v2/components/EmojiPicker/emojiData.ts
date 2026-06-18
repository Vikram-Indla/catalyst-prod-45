export interface EmojiEntry {
  emoji: string;
  name: string;
  keywords: string[];
}

export interface EmojiSection {
  id: string;
  label: string;
  emoji: string;
  entries: EmojiEntry[];
}

const e = (emoji: string, name: string, keywords: string[] = []): EmojiEntry => ({
  emoji,
  name,
  keywords: [name, ...keywords],
});

export const FREQUENTLY_USED: EmojiEntry[] = [
  e('🙌', 'raised hands', ['celebrate', 'praise']),
  e('❤️', 'heart', ['love', 'red']),
  e('😂', 'face with tears of joy', ['lol', 'haha']),
  e('🥲', 'smiling face with tear', ['happy', 'sad']),
  e('👍', 'thumbs up', ['like', 'yes']),
  e('👀', 'eyes', ['look', 'seen']),
  e('🤣', 'rolling on the floor laughing', ['rofl', 'lol']),
  e('👇', 'backhand index pointing down', ['point', 'below']),
  e('😄', 'grinning face with smiling eyes', ['happy']),
  e('🆗', 'ok button', ['okay']),
  e('🙂', 'slightly smiling face', ['happy']),
  e('🎉', 'party popper', ['celebrate', 'tada']),
  e('💵', 'dollar banknote', ['money']),
  e('😆', 'grinning squinting face', ['lol']),
  e('🤔', 'thinking face', ['think', 'hmm']),
  e('✅', 'check mark button', ['done', 'complete']),
];

export const SECTIONS: EmojiSection[] = [
  {
    id: 'work',
    label: 'Getting Work Done',
    emoji: '✅',
    entries: [
      e('✅', 'check'), e('👀', 'eyes'), e('🙌', 'raised hands'),
      e('🙏', 'praying'), e('➕', 'plus'), e('👏', 'clapping'),
      e('💡', 'light bulb'), e('🎯', 'target'), e('👋', 'wave'),
      e('👍', 'thumbs up'), e('🎉', 'party'), e('1️⃣', 'one'),
      e('2️⃣', 'two'), e('3️⃣', 'three'), e('📣', 'megaphone'),
      e('⚪', 'white circle'), e('🔵', 'blue circle'), e('🔴', 'red circle'),
      e('🆒', 'cool'), e('🆗', 'ok'), e('🆘', 'sos'),
      e('💥', 'collision'), e('🚀', 'rocket'), e('🔥', 'fire'),
      e('❤️', 'heart'), e('💯', '100'),
    ],
  },
  {
    id: 'smileys',
    label: 'Smileys & People',
    emoji: '😀',
    entries: [
      e('😀', 'grinning'), e('😃', 'smiley'), e('😄', 'smile'),
      e('😁', 'grin'), e('😆', 'laughing'), e('😅', 'sweat smile'),
      e('🤣', 'rofl'), e('😂', 'joy'), e('🙂', 'slight smile'),
      e('🙃', 'upside down'), e('😉', 'wink'), e('😊', 'blush'),
      e('😇', 'innocent'), e('🥰', 'love'), e('😍', 'heart eyes'),
      e('🤩', 'star struck'), e('😘', 'kiss'), e('😗', 'kiss'),
      e('😚', 'kissing closed eyes'), e('🥲', 'tear'), e('😋', 'yum'),
      e('😛', 'tongue'), e('😜', 'wink tongue'), e('🤪', 'zany'),
      e('🤨', 'raised brow'), e('🧐', 'monocle'), e('🤓', 'nerd'),
      e('😎', 'cool'), e('🥳', 'partying'), e('😏', 'smirk'),
      e('😒', 'unamused'), e('😞', 'disappointed'), e('😔', 'pensive'),
      e('😟', 'worried'), e('😕', 'confused'), e('🙁', 'frown'),
    ],
  },
  {
    id: 'nature',
    label: 'Animals & Nature',
    emoji: '🐶',
    entries: [
      e('🐶', 'dog'), e('🐱', 'cat'), e('🐭', 'mouse'),
      e('🐰', 'rabbit'), e('🦊', 'fox'), e('🐻', 'bear'),
      e('🐼', 'panda'), e('🐨', 'koala'), e('🐯', 'tiger'),
      e('🦁', 'lion'), e('🐮', 'cow'), e('🐷', 'pig'),
      e('🐸', 'frog'), e('🌳', 'tree'), e('🌺', 'flower'),
      e('🌞', 'sun'), e('🌝', 'moon'), e('⭐', 'star'),
    ],
  },
  {
    id: 'food',
    label: 'Food & Drink',
    emoji: '🍔',
    entries: [
      e('🍔', 'burger'), e('🍕', 'pizza'), e('🌭', 'hot dog'),
      e('🥪', 'sandwich'), e('🍟', 'fries'), e('🥗', 'salad'),
      e('🍿', 'popcorn'), e('🥩', 'steak'), e('🍣', 'sushi'),
      e('🍪', 'cookie'), e('🍰', 'cake'), e('🍩', 'donut'),
      e('🍫', 'chocolate'), e('☕', 'coffee'), e('🍵', 'tea'),
      e('🍺', 'beer'), e('🍷', 'wine'), e('🍾', 'champagne'),
    ],
  },
  {
    id: 'travel',
    label: 'Travel & Places',
    emoji: '✈️',
    entries: [
      e('✈️', 'airplane'), e('🚗', 'car'), e('🚕', 'taxi'),
      e('🚙', 'suv'), e('🚌', 'bus'), e('🚎', 'trolley'),
      e('🚓', 'police car'), e('🚑', 'ambulance'), e('🚒', 'fire truck'),
      e('🚐', 'van'), e('🛻', 'pickup'), e('🚚', 'truck'),
      e('🌍', 'globe earth'), e('🌎', 'globe americas'), e('🌏', 'globe asia'),
      e('🗽', 'statue of liberty'), e('🗼', 'tokyo tower'), e('🏰', 'castle'),
    ],
  },
  {
    id: 'activities',
    label: 'Activities',
    emoji: '⚽',
    entries: [
      e('⚽', 'soccer'), e('🏀', 'basketball'), e('🏈', 'football'),
      e('⚾', 'baseball'), e('🥎', 'softball'), e('🎾', 'tennis'),
      e('🏐', 'volleyball'), e('🏉', 'rugby'), e('🎱', 'pool'),
      e('🪀', 'yo-yo'), e('🏓', 'ping pong'), e('🏸', 'badminton'),
      e('🏒', 'hockey'), e('🥍', 'lacrosse'), e('🏏', 'cricket'),
    ],
  },
  {
    id: 'objects',
    label: 'Objects',
    emoji: '💡',
    entries: [
      e('💡', 'bulb'), e('🔦', 'flashlight'), e('🕯️', 'candle'),
      e('🧯', 'extinguisher'), e('🛢️', 'oil drum'), e('💸', 'money flying'),
      e('💵', 'dollar'), e('💴', 'yen'), e('💶', 'euro'),
      e('💷', 'pound'), e('💰', 'money bag'), e('💳', 'credit card'),
      e('🔑', 'key'), e('🔐', 'lock'), e('🔓', 'unlock'),
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    emoji: '☮️',
    entries: [
      e('☮️', 'peace'), e('✝️', 'cross'), e('☪️', 'crescent'),
      e('🕉️', 'om'), e('☸️', 'wheel of dharma'), e('✡️', 'star of david'),
      e('🔯', 'six points'), e('🕎', 'menorah'), e('☯️', 'yin yang'),
      e('☦️', 'orthodox'), e('🛐', 'place of worship'), e('⛎', 'ophiuchus'),
      e('♈', 'aries'), e('♉', 'taurus'), e('♊', 'gemini'),
    ],
  },
  {
    id: 'flags',
    label: 'Flags',
    emoji: '🏁',
    entries: [
      e('🏁', 'checkered flag'), e('🚩', 'red flag'), e('🎌', 'crossed flags'),
      e('🏴', 'black flag'), e('🏳️', 'white flag'), e('🏳️‍🌈', 'rainbow'),
      e('🏳️‍⚧️', 'trans flag'), e('🏴‍☠️', 'pirate'), e('🇺🇸', 'usa'),
      e('🇬🇧', 'uk'), e('🇨🇦', 'canada'), e('🇲🇽', 'mexico'),
    ],
  },
];

export function searchEmojis(query: string): EmojiEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  const out: EmojiEntry[] = [];
  for (const section of SECTIONS) {
    for (const entry of section.entries) {
      if (seen.has(entry.emoji)) continue;
      if (entry.keywords.some(k => k.toLowerCase().includes(q))) {
        seen.add(entry.emoji);
        out.push(entry);
      }
    }
  }
  return out;
}
