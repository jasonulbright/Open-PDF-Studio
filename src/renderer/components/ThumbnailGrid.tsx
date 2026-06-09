import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadDocument, renderPageToCanvas } from '../lib/pdfRenderer';
import { ContextMenu, MenuItem } from './ContextMenu';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PdfBuffer } from '../state/types';

interface ThumbnailGridProps {
  buffer: PdfBuffer;
  pageCount: number;
  selectedPages: number[];
  activePage: number | null;
  onSelectPage: (page: number) => void;
  onTogglePage: (page: number) => void;
  onActivatePage: (page: number) => void;
  onRotate?: (page: number, angle: number) => void;
  onDelete?: (page: number) => void;
  onExtractText?: (page: number) => void;
}

const THUMB_SCALE = 0.3;

function Thumbnail({ doc, page, selected, active, onClick, onContextMenu }: {
  doc: PDFDocumentProxy;
  page: number;
  selected: boolean;
  active: boolean;
  onClick: (page: number, e: React.MouseEvent) => void;
  onContextMenu: (page: number, e: React.MouseEvent) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    renderPageToCanvas(doc, page, THUMB_SCALE).then((canvas) => {
      if (cancelled || !containerRef.current) return;
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
      canvas.style.objectFit = 'contain';
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(canvas);
    }).catch((err) => console.error(`Thumbnail page ${page}:`, err));
    return () => { cancelled = true; };
  }, [doc, page]);

  return (
    <div
      onClick={(e) => onClick(page, e)}
      onContextMenu={(e) => onContextMenu(page, e)}
      className={`flex flex-col items-center gap-1 p-2 rounded cursor-pointer transition-colors
        ${active ? 'bg-blue-600/30 ring-2 ring-blue-500' : selected ? 'bg-blue-600/20' : 'hover:bg-neutral-800'}`}
    >
      <div ref={containerRef} className="bg-white rounded shadow-sm overflow-hidden flex items-center justify-center" style={{ width: 120, height: 160 }}>
        <div className="text-neutral-400 text-xs">Loading...</div>
      </div>
      <span className="text-xs text-neutral-400">{page}</span>
    </div>
  );
}

export function ThumbnailGrid({
  buffer,
  pageCount,
  selectedPages,
  activePage,
  onSelectPage,
  onTogglePage,
  onActivatePage,
  onRotate,
  onDelete,
  onExtractText,
}: ThumbnailGridProps): React.ReactElement {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; page: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDocument(buffer).then((d) => {
      if (!cancelled) setDoc(d);
    }).catch((err) => console.error('pdf.js loadDocument failed:', err));
    return () => { cancelled = true; };
  }, [buffer]);

  const handleClick = useCallback((page: number, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      onTogglePage(page);
    } else if (e.detail === 2) {
      onActivatePage(page);
    } else {
      onSelectPage(page);
    }
  }, [onSelectPage, onTogglePage, onActivatePage]);

  const handleContextMenu = useCallback((page: number, e: React.MouseEvent) => {
    e.preventDefault();
    onSelectPage(page);
    setContextMenu({ x: e.clientX, y: e.clientY, page });
  }, [onSelectPage]);

  const contextMenuItems: MenuItem[] = contextMenu ? [
    { label: 'View Page', onClick: () => onActivatePage(contextMenu.page) },
    { label: '', onClick: () => {}, separator: true },
    { label: 'Rotate 90° CW', onClick: () => onRotate?.(contextMenu.page, 90), disabled: !onRotate },
    { label: 'Rotate 90° CCW', onClick: () => onRotate?.(contextMenu.page, 270), disabled: !onRotate },
    { label: 'Rotate 180°', onClick: () => onRotate?.(contextMenu.page, 180), disabled: !onRotate },
    { label: '', onClick: () => {}, separator: true },
    { label: 'Extract Text', onClick: () => onExtractText?.(contextMenu.page), disabled: !onExtractText },
    { label: '', onClick: () => {}, separator: true },
    { label: 'Delete Page', onClick: () => onDelete?.(contextMenu.page), danger: true, disabled: !onDelete },
  ] : [];

  if (!doc) return <div className="p-4 text-neutral-500">Loading document...</div>;

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-2">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
          <Thumbnail
            key={page}
            doc={doc}
            page={page}
            selected={selectedPages.includes(page)}
            active={activePage === page}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
