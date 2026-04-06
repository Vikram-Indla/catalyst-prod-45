import { useState, useCallback, useRef, useEffect } from "react";
import type { Notification, ToastNotification } from "@/types/notifications";
import { TOAST_DISMISS_HIGH_MS, TOAST_DISMISS_LOW_MS } from "@/constants/notificationConstants";

const HIGH_PRIORITY_TYPES = ['assigned_work_item', 'assigned_story', 'mentioned_in_comment', 'incident_escalated'];
const MAX_TOASTS = 3;

export default function useToastQueue() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) { clearInterval(timer); timersRef.current.delete(id); }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const startTimer = useCallback((id: string) => {
    const timer = setInterval(() => {
      setToasts(prev => {
        const toast = prev.find(t => t.id === id);
        if (!toast || toast.isPaused) return prev;
        const elapsed = 50;
        const remaining = toast.remainingMs - elapsed;
        if (remaining <= 0) {
          clearInterval(timer);
          timersRef.current.delete(id);
          return prev.filter(t => t.id !== id);
        }
        return prev.map(t => t.id === id ? { ...t, remainingMs: remaining } : t);
      });
    }, 50);
    timersRef.current.set(id, timer);
  }, []);

  const addToast = useCallback((notification: Notification) => {
    const isHigh = HIGH_PRIORITY_TYPES.includes(notification.notification_type);
    const dismissAfterMs = isHigh ? TOAST_DISMISS_HIGH_MS : TOAST_DISMISS_LOW_MS;
    const id = `toast-${notification.id}-${Date.now()}`;

    const newToast: ToastNotification = {
      id,
      notification,
      dismissAfterMs,
      isPaused: false,
      startTime: Date.now(),
      remainingMs: dismissAfterMs,
    };

    setToasts(prev => {
      const next = [newToast, ...prev];
      if (next.length > MAX_TOASTS) {
        const removed = next[next.length - 1];
        const timer = timersRef.current.get(removed.id);
        if (timer) { clearInterval(timer); timersRef.current.delete(removed.id); }
        return next.slice(0, MAX_TOASTS);
      }
      return next;
    });

    startTimer(id);
  }, [startTimer]);

  const pauseToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isPaused: true } : t));
  }, []);

  const resumeToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isPaused: false } : t));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearInterval(timer));
      timersRef.current.clear();
    };
  }, []);

  return { toasts, addToast, dismiss, pauseToast, resumeToast };
}
