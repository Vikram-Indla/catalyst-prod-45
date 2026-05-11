import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import type { ReactNode } from "react";

import * as styles from "../Editor.css";

export type SuggestionItem = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
};

export type SuggestionListProps = {
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
};

export type SuggestionListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter((c): c is string => Boolean(c)).join(" ");

export const SuggestionList = forwardRef<
  SuggestionListHandle,
  SuggestionListProps
>(function SuggestionList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) =>
            items.length === 0 ? 0 : (i + 1) % items.length,
          );
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) =>
            items.length === 0 ? 0 : (i - 1 + items.length) % items.length,
          );
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }),
    [selectedIndex, items],
  );

  if (items.length === 0) {
    return <div className={styles.suggestionEmpty}>No matches</div>;
  }

  return (
    <div className={styles.suggestionList} role="listbox">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={i === selectedIndex}
          className={cx(
            styles.suggestionItem,
            i === selectedIndex && styles.suggestionItemActive,
          )}
          onMouseEnter={() => setSelectedIndex(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => selectItem(i)}
        >
          {item.icon && (
            <span className={styles.suggestionIcon}>{item.icon}</span>
          )}
          <span className={styles.suggestionTextGroup}>
            <span className={styles.suggestionLabel}>{item.label}</span>
            {item.description && (
              <span className={styles.suggestionDescription}>
                {item.description}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
});
