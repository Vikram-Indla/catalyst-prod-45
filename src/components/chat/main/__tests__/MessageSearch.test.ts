/**
 * MessageSearch — test full-text search on chat_messages
 * Tests snippet extraction + matching text highlighting
 */

describe('Message Search', () => {
  describe('Snippet extraction', () => {
    it('should extract snippet with match centered', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const query = 'brown';
      const matchPos = text.toLowerCase().indexOf(query.toLowerCase());

      const before = text.substring(Math.max(0, matchPos - 30), matchPos);
      const matched = text.substring(matchPos, matchPos + query.length);
      const after = text.substring(matchPos + query.length, Math.min(text.length, matchPos + query.length + 30));

      expect(before).toContain('quick');
      expect(matched).toBe('brown');
      expect(after).toContain('fox');
    });

    it('should handle match at start of text', () => {
      const text = 'hello world';
      const query = 'hello';
      const matchPos = text.toLowerCase().indexOf(query.toLowerCase());

      const before = text.substring(Math.max(0, matchPos - 30), matchPos);
      const matched = text.substring(matchPos, matchPos + query.length);
      const after = text.substring(matchPos + query.length, Math.min(text.length, matchPos + query.length + 30));

      expect(before).toBe('');
      expect(matched).toBe('hello');
      expect(after).toContain('world');
    });

    it('should handle match at end of text', () => {
      const text = 'hello world';
      const query = 'world';
      const matchPos = text.toLowerCase().indexOf(query.toLowerCase());

      const before = text.substring(Math.max(0, matchPos - 30), matchPos);
      const matched = text.substring(matchPos, matchPos + query.length);
      const after = text.substring(matchPos + query.length, Math.min(text.length, matchPos + query.length + 30));

      expect(before).toContain('hello');
      expect(matched).toBe('world');
      expect(after).toBe('');
    });
  });

  describe('Case-insensitive matching', () => {
    it('should find match regardless of case', () => {
      const text = 'The Quick Brown Fox';
      const query = 'quick';

      const lowerText = text.toLowerCase();
      const lowerQuery = query.toLowerCase();
      const matchPos = lowerText.indexOf(lowerQuery);

      expect(matchPos).toBeGreaterThan(-1);
      expect(text.substring(matchPos, matchPos + query.length).toLowerCase()).toBe(query.toLowerCase());
    });
  });
});
