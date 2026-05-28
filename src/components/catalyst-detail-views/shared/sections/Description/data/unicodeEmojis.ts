/**
 * Unicode emoji data for the EmojiPicker.
 *
 * v1 ships a curated subset (~250 emoji across 8 categories) rather than the
 * full 3000+ Unicode set, to keep the bundle small. The picker also supports
 * search by name, and a separate "frequently used" row backed by localStorage.
 */

export interface EmojiEntry {
  char: string;
  name: string;
  shortName: string;
}

export interface EmojiCategory {
  id: string;
  label: string;
  emojis: EmojiEntry[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    label: 'Smileys & emotion',
    emojis: [
      { char: '😀', name: 'grinning face', shortName: 'grinning' },
      { char: '😃', name: 'smiling face', shortName: 'smiley' },
      { char: '😄', name: 'smiling face with smiling eyes', shortName: 'smile' },
      { char: '😁', name: 'beaming face', shortName: 'grin' },
      { char: '😆', name: 'laughing', shortName: 'laughing' },
      { char: '😅', name: 'sweat smile', shortName: 'sweat_smile' },
      { char: '🤣', name: 'rolling on the floor laughing', shortName: 'rofl' },
      { char: '😂', name: 'face with tears of joy', shortName: 'joy' },
      { char: '🙂', name: 'slightly smiling face', shortName: 'slight_smile' },
      { char: '😉', name: 'winking face', shortName: 'wink' },
      { char: '😊', name: 'blushing', shortName: 'blush' },
      { char: '😍', name: 'heart eyes', shortName: 'heart_eyes' },
      { char: '🥰', name: 'smiling face with hearts', shortName: 'smiling_face_with_three_hearts' },
      { char: '😘', name: 'face blowing a kiss', shortName: 'kissing_heart' },
      { char: '😎', name: 'sunglasses', shortName: 'sunglasses' },
      { char: '🤩', name: 'star-struck', shortName: 'star_struck' },
      { char: '🤔', name: 'thinking face', shortName: 'thinking' },
      { char: '🤨', name: 'raised eyebrow', shortName: 'raised_eyebrow' },
      { char: '😐', name: 'neutral face', shortName: 'neutral_face' },
      { char: '😑', name: 'expressionless face', shortName: 'expressionless' },
      { char: '😶', name: 'face without mouth', shortName: 'no_mouth' },
      { char: '🙄', name: 'rolling eyes', shortName: 'roll_eyes' },
      { char: '😏', name: 'smirking face', shortName: 'smirk' },
      { char: '😒', name: 'unamused face', shortName: 'unamused' },
      { char: '😞', name: 'disappointed', shortName: 'disappointed' },
      { char: '😔', name: 'pensive', shortName: 'pensive' },
      { char: '😢', name: 'crying face', shortName: 'cry' },
      { char: '😭', name: 'loudly crying', shortName: 'sob' },
      { char: '😡', name: 'pouting face', shortName: 'rage' },
      { char: '🤬', name: 'cursing face', shortName: 'cursing_face' },
      { char: '😱', name: 'face screaming', shortName: 'scream' },
      { char: '😴', name: 'sleeping face', shortName: 'sleeping' },
      { char: '🤯', name: 'mind blown', shortName: 'exploding_head' },
      { char: '🥳', name: 'partying face', shortName: 'partying_face' },
    ],
  },
  {
    id: 'people',
    label: 'People & body',
    emojis: [
      { char: '👋', name: 'waving hand', shortName: 'wave' },
      { char: '👍', name: 'thumbs up', shortName: '+1' },
      { char: '👎', name: 'thumbs down', shortName: '-1' },
      { char: '👏', name: 'clapping hands', shortName: 'clap' },
      { char: '🙌', name: 'raising hands', shortName: 'raised_hands' },
      { char: '🤝', name: 'handshake', shortName: 'handshake' },
      { char: '👌', name: 'OK hand', shortName: 'ok_hand' },
      { char: '✌️', name: 'victory hand', shortName: 'v' },
      { char: '🤞', name: 'crossed fingers', shortName: 'crossed_fingers' },
      { char: '🤟', name: 'love-you gesture', shortName: 'love_you_gesture' },
      { char: '🙏', name: 'folded hands', shortName: 'pray' },
      { char: '💪', name: 'flexed biceps', shortName: 'muscle' },
      { char: '👀', name: 'eyes', shortName: 'eyes' },
      { char: '👤', name: 'bust in silhouette', shortName: 'bust_in_silhouette' },
      { char: '👥', name: 'busts in silhouette', shortName: 'busts_in_silhouette' },
      { char: '🧑‍💻', name: 'technologist', shortName: 'technologist' },
      { char: '👨‍💼', name: 'man office worker', shortName: 'office_worker' },
      { char: '👩‍🎨', name: 'woman artist', shortName: 'artist' },
    ],
  },
  {
    id: 'animals',
    label: 'Animals & nature',
    emojis: [
      { char: '🐶', name: 'dog face', shortName: 'dog' },
      { char: '🐱', name: 'cat face', shortName: 'cat' },
      { char: '🐭', name: 'mouse', shortName: 'mouse' },
      { char: '🐹', name: 'hamster', shortName: 'hamster' },
      { char: '🐰', name: 'rabbit', shortName: 'rabbit' },
      { char: '🦊', name: 'fox', shortName: 'fox' },
      { char: '🐻', name: 'bear', shortName: 'bear' },
      { char: '🐼', name: 'panda', shortName: 'panda' },
      { char: '🐨', name: 'koala', shortName: 'koala' },
      { char: '🐯', name: 'tiger', shortName: 'tiger' },
      { char: '🦁', name: 'lion', shortName: 'lion' },
      { char: '🐮', name: 'cow', shortName: 'cow' },
      { char: '🐷', name: 'pig', shortName: 'pig' },
      { char: '🐸', name: 'frog', shortName: 'frog' },
      { char: '🐵', name: 'monkey', shortName: 'monkey' },
      { char: '🦄', name: 'unicorn', shortName: 'unicorn' },
      { char: '🐝', name: 'bee', shortName: 'bee' },
      { char: '🦋', name: 'butterfly', shortName: 'butterfly' },
      { char: '🌸', name: 'cherry blossom', shortName: 'cherry_blossom' },
      { char: '🌳', name: 'tree', shortName: 'deciduous_tree' },
      { char: '🌵', name: 'cactus', shortName: 'cactus' },
      { char: '☀️', name: 'sun', shortName: 'sunny' },
      { char: '🌧️', name: 'rain', shortName: 'rain_cloud' },
      { char: '⚡', name: 'lightning', shortName: 'zap' },
    ],
  },
  {
    id: 'food',
    label: 'Food & drink',
    emojis: [
      { char: '🍎', name: 'red apple', shortName: 'apple' },
      { char: '🍌', name: 'banana', shortName: 'banana' },
      { char: '🍕', name: 'pizza', shortName: 'pizza' },
      { char: '🍔', name: 'burger', shortName: 'burger' },
      { char: '🍟', name: 'fries', shortName: 'fries' },
      { char: '🌮', name: 'taco', shortName: 'taco' },
      { char: '🍣', name: 'sushi', shortName: 'sushi' },
      { char: '🍰', name: 'cake', shortName: 'cake' },
      { char: '🍩', name: 'donut', shortName: 'doughnut' },
      { char: '🍪', name: 'cookie', shortName: 'cookie' },
      { char: '☕', name: 'coffee', shortName: 'coffee' },
      { char: '🍺', name: 'beer', shortName: 'beer' },
      { char: '🍷', name: 'wine', shortName: 'wine_glass' },
      { char: '🥤', name: 'cup with straw', shortName: 'cup_with_straw' },
    ],
  },
  {
    id: 'activities',
    label: 'Activities',
    emojis: [
      { char: '⚽', name: 'soccer ball', shortName: 'soccer' },
      { char: '🏀', name: 'basketball', shortName: 'basketball' },
      { char: '🏈', name: 'football', shortName: 'football' },
      { char: '⚾', name: 'baseball', shortName: 'baseball' },
      { char: '🎾', name: 'tennis', shortName: 'tennis' },
      { char: '🏐', name: 'volleyball', shortName: 'volleyball' },
      { char: '🎮', name: 'video game', shortName: 'video_game' },
      { char: '🎲', name: 'die', shortName: 'game_die' },
      { char: '🎯', name: 'bullseye', shortName: 'dart' },
      { char: '🎤', name: 'microphone', shortName: 'microphone' },
      { char: '🎧', name: 'headphones', shortName: 'headphones' },
      { char: '🎨', name: 'paint palette', shortName: 'art' },
    ],
  },
  {
    id: 'travel',
    label: 'Travel & places',
    emojis: [
      { char: '🚗', name: 'car', shortName: 'car' },
      { char: '🚕', name: 'taxi', shortName: 'taxi' },
      { char: '🚌', name: 'bus', shortName: 'bus' },
      { char: '🚓', name: 'police car', shortName: 'police_car' },
      { char: '🚑', name: 'ambulance', shortName: 'ambulance' },
      { char: '🚒', name: 'fire engine', shortName: 'fire_engine' },
      { char: '✈️', name: 'airplane', shortName: 'airplane' },
      { char: '🚀', name: 'rocket', shortName: 'rocket' },
      { char: '🛳️', name: 'ship', shortName: 'ship' },
      { char: '🏠', name: 'house', shortName: 'house' },
      { char: '🏢', name: 'office building', shortName: 'office' },
      { char: '🌍', name: 'globe Europe-Africa', shortName: 'earth_africa' },
      { char: '🌎', name: 'globe Americas', shortName: 'earth_americas' },
      { char: '🌏', name: 'globe Asia-Australia', shortName: 'earth_asia' },
    ],
  },
  {
    id: 'objects',
    label: 'Objects',
    emojis: [
      { char: '💡', name: 'light bulb', shortName: 'bulb' },
      { char: '📌', name: 'pushpin', shortName: 'pushpin' },
      { char: '📎', name: 'paperclip', shortName: 'paperclip' },
      { char: '✏️', name: 'pencil', shortName: 'pencil2' },
      { char: '📝', name: 'memo', shortName: 'memo' },
      { char: '📚', name: 'books', shortName: 'books' },
      { char: '💻', name: 'laptop', shortName: 'computer' },
      { char: '🖥️', name: 'desktop', shortName: 'desktop_computer' },
      { char: '📱', name: 'mobile phone', shortName: 'iphone' },
      { char: '⌚', name: 'watch', shortName: 'watch' },
      { char: '📷', name: 'camera', shortName: 'camera' },
      { char: '🎬', name: 'clapper board', shortName: 'clapper' },
      { char: '🔑', name: 'key', shortName: 'key' },
      { char: '🔒', name: 'lock', shortName: 'lock' },
      { char: '🔓', name: 'open lock', shortName: 'unlock' },
      { char: '🛠️', name: 'tools', shortName: 'tools' },
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    emojis: [
      { char: '❤️', name: 'red heart', shortName: 'heart' },
      { char: '🧡', name: 'orange heart', shortName: 'orange_heart' },
      { char: '💛', name: 'yellow heart', shortName: 'yellow_heart' },
      { char: '💚', name: 'green heart', shortName: 'green_heart' },
      { char: '💙', name: 'blue heart', shortName: 'blue_heart' },
      { char: '💜', name: 'purple heart', shortName: 'purple_heart' },
      { char: '🖤', name: 'black heart', shortName: 'black_heart' },
      { char: '⭐', name: 'star', shortName: 'star' },
      { char: '🌟', name: 'glowing star', shortName: 'star2' },
      { char: '✨', name: 'sparkles', shortName: 'sparkles' },
      { char: '🔥', name: 'fire', shortName: 'fire' },
      { char: '💯', name: 'hundred', shortName: '100' },
      { char: '✅', name: 'check mark button', shortName: 'white_check_mark' },
      { char: '❌', name: 'cross mark', shortName: 'x' },
      { char: '⚠️', name: 'warning', shortName: 'warning' },
      { char: '❓', name: 'question', shortName: 'question' },
      { char: '❗', name: 'exclamation', shortName: 'exclamation' },
      { char: '➕', name: 'plus', shortName: 'heavy_plus_sign' },
      { char: '➖', name: 'minus', shortName: 'heavy_minus_sign' },
      { char: '🔔', name: 'bell', shortName: 'bell' },
    ],
  },
];

export const ALL_EMOJIS: EmojiEntry[] = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

const FREQ_KEY = 'catalyst.description.emoji.frequently';
const MAX_FREQUENTLY = 16;

export function readFrequentlyUsed(): EmojiEntry[] {
  try {
    const raw = localStorage.getItem(FREQ_KEY);
    if (!raw) return [];
    const ids = JSON.parse(raw) as string[];
    return ids
      .map((id) => ALL_EMOJIS.find((e) => e.shortName === id))
      .filter((e): e is EmojiEntry => e != null);
  } catch {
    return [];
  }
}

export function recordEmojiUsed(shortName: string): void {
  try {
    const raw = localStorage.getItem(FREQ_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [shortName, ...ids.filter((i) => i !== shortName)].slice(0, MAX_FREQUENTLY);
    localStorage.setItem(FREQ_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be unavailable in some sandboxes; silently ignore.
  }
}
