import useToastQueue from "@/hooks/useToastQueue";
import ToastToken from "./ToastToken";
import { DRAWER_WIDTH } from "@/constants/notificationConstants";

interface ToastContainerProps {
  drawerOpen: boolean;
}

export default function ToastContainer({ drawerOpen }: ToastContainerProps) {
  const { toasts, dismiss, pauseToast, resumeToast } = useToastQueue();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      tabIndex={-1}
      style={{
        position: 'fixed',
        bottom: 24,
        right: drawerOpen ? DRAWER_WIDTH + 24 : 24,
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 8,
        transition: 'right 200ms ease-in-out',
      }}
    >
      {toasts.map(t => (
        <ToastToken
          key={t.id}
          toast={t}
          onDismiss={dismiss}
          onPause={pauseToast}
          onResume={resumeToast}
        />
      ))}
    </div>
  );
}
