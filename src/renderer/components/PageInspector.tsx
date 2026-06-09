import React, { useEffect, useRef } from 'react';
import { loadDocument, renderPageToCanvas } from '../lib/pdfRenderer';
import type { PdfBuffer } from '../state/types';

interface PageInspectorProps {
  buffer: PdfBuffer;
  page: number;
  onClose: () => void;
  onRotate?: (page: number, angle: number) => void;
  onDelete?: (page: number) => void;
}

const PREVIEW_SCALE = 1.2;

export function PageInspector({ buffer, page, onClose, onRotate, onDelete }: PageInspectorProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadDocument(buffer).then(async (doc) => {
      if (cancelled) return;
      const canvas = await renderPageToCanvas(doc, page, PREVIEW_SCALE);
      if (cancelled || !containerRef.current) { doc.loadingTask.destroy(); return; }
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
      canvas.style.objectFit = 'contain';
      canvas.className = 'shadow-lg';
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(canvas);
      doc.loadingTask.destroy();
    }).catch((err) => console.error('PageInspector render failed:', err));
    return () => { cancelled = true; };
  }, [buffer, page]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 shrink-0">
        <span className="text-sm font-medium">Page {page}</span>
        <div className="flex gap-2">
          {onRotate && (
            <>
              <button onClick={() => onRotate(page, 270)} className="px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 rounded">CCW</button>
              <button onClick={() => onRotate(page, 90)} className="px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 rounded">CW</button>
            </>
          )}
          {onDelete && (
            <button onClick={() => onDelete(page)} className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-500 rounded">Delete</button>
          )}
          <button onClick={onClose} className="px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 rounded">Close</button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-auto p-4 bg-neutral-950">
        <div className="text-neutral-500">Rendering...</div>
      </div>
    </div>
  );
}
