import React from 'react';

interface NoFileOpenProps {
  onOpen: () => void;
  message?: string;
}

export function NoFileOpen({ onOpen, message = 'Open a PDF to get started' }: NoFileOpenProps): React.ReactElement {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <p className="text-neutral-500 mb-3">{message}</p>
        <button onClick={onOpen} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium">
          Open PDF
        </button>
      </div>
    </div>
  );
}
