/**
 * CommentComposer — Comment composer (F2.11)
 */
import React, { memo, useState } from 'react';

export const CommentComposer = memo(function CommentComposer({ onSubmit }: { onSubmit: (comment: string) => void }) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    onSubmit(value);
    setValue('');
  };

  return (
    <div>
      <h2>Add Comment</h2>
      <textarea
        data-testid="comment-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a comment..."
      />
      <button onClick={handleSubmit} disabled={!value.trim()}>
        Add comment
      </button>
    </div>
  );
});
