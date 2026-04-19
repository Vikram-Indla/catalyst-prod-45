/**
 * Modal — Catalyst wrapper over @atlaskit/modal-dialog.
 *
 * Thin for now; a Minimise extension will be added in a follow-up WO to
 * implement Jira's "minimise the modal while keeping it in the task bar"
 * behaviour. That capability does not exist in @atlaskit/modal-dialog
 * today so we own it at this layer.
 *
 * Composition API
 * ───────────────
 * Modal is composed from Header, Body, Footer, and Title so callers can
 * lay out content without knowing Atlaskit's internal slots. The default
 * export is the provider Modal; named exports compose inside it.
 *
 *   <Modal isOpen onClose={close}>
 *     <ModalHeader>
 *       <ModalTitle>Move story</ModalTitle>
 *     </ModalHeader>
 *     <ModalBody>…</ModalBody>
 *     <ModalFooter>
 *       <Button appearance="subtle" onClick={close}>Cancel</Button>
 *       <Button appearance="primary" onClick={commit}>Move</Button>
 *     </ModalFooter>
 *   </Modal>
 */
import AkModalDialog, {
  ModalTransition as AkModalTransition,
  ModalBody as AkModalBody,
  ModalFooter as AkModalFooter,
  ModalHeader as AkModalHeader,
  ModalTitle as AkModalTitle,
} from '@atlaskit/modal-dialog';
import { type ReactNode } from 'react';

export type ModalWidth = 'small' | 'medium' | 'large' | 'x-large' | number | string;

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  width?: ModalWidth;
  /** Prevents close on backdrop click / ESC — use sparingly. */
  shouldCloseOnOverlayClick?: boolean;
  shouldCloseOnEscapePress?: boolean;
  /** Nudges Atlaskit's focus trap to a specific node on open. */
  autoFocus?: boolean;
  /** Return focus to the last-active element on close. Default true. */
  shouldReturnFocus?: boolean;
  testId?: string;
  children: ReactNode;
  /** ARIA label — required when the modal has no visible title. */
  'aria-label'?: string;
}

export function Modal({
  isOpen,
  onClose,
  width = 'medium',
  shouldCloseOnOverlayClick = true,
  shouldCloseOnEscapePress = true,
  autoFocus = true,
  shouldReturnFocus = true,
  testId,
  children,
  ...rest
}: ModalProps) {
  return (
    <AkModalTransition>
      {isOpen ? (
        <AkModalDialog
          onClose={onClose}
          width={width}
          shouldCloseOnOverlayClick={shouldCloseOnOverlayClick}
          shouldCloseOnEscapePress={shouldCloseOnEscapePress}
          autoFocus={autoFocus}
          shouldReturnFocus={shouldReturnFocus}
          testId={testId}
          label={rest['aria-label']}
        >
          {children}
        </AkModalDialog>
      ) : null}
    </AkModalTransition>
  );
}

export function ModalHeader({ children, testId }: { children: ReactNode; testId?: string }) {
  return <AkModalHeader testId={testId}>{children}</AkModalHeader>;
}
export function ModalTitle({ children, testId }: { children: ReactNode; testId?: string }) {
  return <AkModalTitle testId={testId}>{children}</AkModalTitle>;
}
export function ModalBody({ children, testId }: { children: ReactNode; testId?: string }) {
  return <AkModalBody testId={testId}>{children}</AkModalBody>;
}
export function ModalFooter({ children, testId }: { children: ReactNode; testId?: string }) {
  return <AkModalFooter testId={testId}>{children}</AkModalFooter>;
}
