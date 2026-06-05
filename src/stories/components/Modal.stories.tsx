import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useCallback } from 'react';
import Modal, { ModalTransition, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';

function ModalDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return (
    <>
      <Button appearance="primary" onClick={open}>Open modal</Button>
      <ModalTransition>
        {isOpen && (
          <Modal onClose={close}>
            <ModalHeader><ModalTitle>Confirm action</ModalTitle></ModalHeader>
            <ModalBody><p>Are you sure you want to transition this issue to Done? This will notify all watchers.</p></ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={close}>Cancel</Button>
              <Button appearance="primary" onClick={close}>Confirm</Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </>
  );
}

function DangerModalDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return (
    <>
      <Button appearance="danger" onClick={open}>Delete issue</Button>
      <ModalTransition>
        {isOpen && (
          <Modal onClose={close}>
            <ModalHeader><ModalTitle appearance="danger">Delete BAU-5957</ModalTitle></ModalHeader>
            <ModalBody><p>This action cannot be undone. The issue and all its subtasks will be permanently removed.</p></ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={close}>Cancel</Button>
              <Button appearance="danger" onClick={close}>Delete</Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </>
  );
}

const meta: Meta = { title: 'Components/Modal', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;
export const Default: Story = { render: () => <ModalDemo /> };
export const Danger: Story = { render: () => <DangerModalDemo /> };
