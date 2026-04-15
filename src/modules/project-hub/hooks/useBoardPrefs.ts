import { useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { boardApi } from '../api/boardApi';
import { PREFS_DEBOUNCE_MS } from '../constants/kanban';
import type { BoardUserPrefs } from '../types/kanban';

export function useBoardPrefs(boardId: string, userId: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: prefs } = useQuery({
    queryKey: ['board-prefs', boardId, userId],
    queryFn:  () => boardApi.fetchBoardUserPrefs(boardId, userId),
    enabled:  !!boardId && !!userId,
  });

  const mutation = useMutation({
    mutationFn: (p: BoardUserPrefs) =>
      boardApi.saveBoardUserPrefs(boardId, userId, p),
  });

  const savePrefs = useCallback(
    (next: BoardUserPrefs) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(
        () => mutation.mutate(next),
        PREFS_DEBOUNCE_MS
      );
    },
    [mutation]
  );

  return { prefs, savePrefs };
}
