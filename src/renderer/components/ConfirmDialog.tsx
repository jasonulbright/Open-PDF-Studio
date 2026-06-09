import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export type ConfirmResult = 'save' | 'discard' | 'cancel';

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  onResult: (result: ConfirmResult) => void;
}

export function ConfirmDialog({ open, message, onResult }: ConfirmDialogProps): React.ReactElement {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onResult('cancel'); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl w-[400px] p-5"
          onEscapeKeyDown={() => onResult('cancel')}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <Dialog.Title className="text-sm font-semibold text-neutral-100 mb-1">
            Unsaved Changes
          </Dialog.Title>
          <Dialog.Description className="text-sm text-neutral-400 mb-5">
            {message}
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => onResult('discard')}
              className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
            >
              Don't Save
            </button>
            <button
              onClick={() => onResult('cancel')}
              className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onResult('save')}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
              autoFocus
            >
              Save
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
