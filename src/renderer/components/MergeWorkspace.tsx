import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { loadDocument, renderPageToCanvas } from '../lib/pdfRenderer';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { OpenFile } from '../state/types';

interface PageRef {
  id: string;        // unique: "filepath::pagenum"
  filePath: string;
  fileName: string;
  page: number;
}

interface MergeWorkspaceProps {
  files: OpenFile[];
  onMerge: (pages: PageRef[]) => void;
}

const THUMB_SCALE = 0.25;

function SortablePageThumb({ pageRef, doc }: { pageRef: PageRef; doc: PDFDocumentProxy | null }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pageRef.id });
  const containerRef = useRef<HTMLDivElement>(null);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  useEffect(() => {
    if (!doc || !containerRef.current) return;
    let cancelled = false;
    renderPageToCanvas(doc, pageRef.page, THUMB_SCALE).then((canvas) => {
      if (cancelled || !containerRef.current) return;
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
      canvas.style.objectFit = 'contain';
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(canvas);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [doc, pageRef.page]);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="flex flex-col items-center gap-1 p-1.5 rounded cursor-grab active:cursor-grabbing hover:bg-neutral-800"
    >
      <div ref={containerRef} className="bg-white rounded shadow-sm overflow-hidden flex items-center justify-center" style={{ width: 90, height: 120 }}>
        <div className="text-neutral-400 text-[10px]">...</div>
      </div>
      <div className="text-[10px] text-neutral-500 text-center truncate w-[90px]">
        {pageRef.fileName} p{pageRef.page}
      </div>
    </div>
  );
}

function SourceThumb({ doc, page }: { doc: PDFDocumentProxy | null; page: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!doc || !containerRef.current) return;
    let cancelled = false;
    renderPageToCanvas(doc, page, 0.2).then((canvas) => {
      if (cancelled || !containerRef.current) return;
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
      canvas.style.objectFit = 'contain';
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(canvas);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [doc, page]);

  return (
    <div ref={containerRef} className="bg-white rounded shadow-sm overflow-hidden flex items-center justify-center" style={{ width: 70, height: 90 }}>
      <div className="text-neutral-400 text-[10px]">...</div>
    </div>
  );
}

function SourcePanel({ file, doc }: { file: OpenFile; doc: PDFDocumentProxy | null }) {
  return (
    <div className="shrink-0">
      <div className="text-xs font-medium text-neutral-400 px-2 mb-1 truncate" title={file.path}>{file.name}</div>
      <div className="flex flex-wrap gap-1 px-1">
        {Array.from({ length: file.pageCount }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5 p-1">
            <SourceThumb doc={doc} page={i + 1} />
            <span className="text-[9px] text-neutral-500">{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MergeWorkspace({ files, onMerge }: MergeWorkspaceProps): React.ReactElement {
  const [outputPages, setOutputPages] = useState<PageRef[]>([]);
  const [docs, setDocs] = useState<Map<string, PDFDocumentProxy>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Load documents
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      for (const file of files) {
        if (!file.buffer || cancelled) continue;
        try {
          const doc = await loadDocument(file.buffer);
          if (cancelled) { doc.loadingTask.destroy(); return; }
          setDocs((prev) => new Map(prev).set(file.path, doc));
        } catch { /* skip pages that fail to render */ }
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, [files]);

  // Initialize output with all pages in file order
  useEffect(() => {
    const pages: PageRef[] = [];
    for (const file of files) {
      for (let i = 1; i <= file.pageCount; i++) {
        pages.push({
          id: `${file.path}::${i}`,
          filePath: file.path,
          fileName: file.name,
          page: i,
        });
      }
    }
    setOutputPages(pages);
  }, [files]);

  const removePage = useCallback((id: string) => {
    setOutputPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOutputPages((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });
  };

  const activeItem = activeId ? outputPages.find((p) => p.id === activeId) : null;

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Source files — constrained height with scroll */}
      <div className="shrink-0 max-h-[40%] flex flex-col border-b border-neutral-800 pb-3">
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-widest px-2 mb-2 shrink-0">Source Documents</div>
        <div className="flex gap-4 overflow-x-auto overflow-y-auto px-2 min-h-0">
          {files.map((f) => (
            <SourcePanel key={f.path} file={f} doc={docs.get(f.path) || null} />
          ))}
        </div>
        <p className="text-[10px] text-neutral-500 px-2 mt-1 shrink-0">Click a source page to add it to the output below</p>
      </div>

      {/* Output sequence — drag to reorder */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-2 mb-2">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
            Output Sequence ({outputPages.length} pages)
          </div>
          <div className="flex gap-2">
            <button onClick={() => setOutputPages([])} className="px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 rounded">Clear</button>
            <button
              onClick={() => onMerge(outputPages)}
              disabled={outputPages.length === 0}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded font-medium"
            >
              Build Merged PDF
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto bg-neutral-850 rounded p-2 transition-colors ${
          activeId ? 'border-2 border-dashed border-blue-500' : 'border border-neutral-800'
        }`}>
          {outputPages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
              Click source pages above or drag to reorder
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={outputPages.map((p) => p.id)} strategy={rectSortingStrategy}>
                <div className="flex flex-wrap gap-1">
                  {outputPages.map((pageRef) => (
                    <div key={pageRef.id} className="relative group">
                      <SortablePageThumb pageRef={pageRef} doc={docs.get(pageRef.filePath) || null} />
                      <button
                        onClick={() => removePage(pageRef.id)}
                        className="absolute top-0 right-0 w-5 h-5 bg-red-600 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2.5 2.5l5 5M7.5 2.5l-5 5"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeItem && (
                  <div className="flex flex-col items-center gap-1 p-1.5 bg-neutral-700 rounded shadow-lg">
                    <div className="bg-white rounded shadow-sm overflow-hidden flex items-center justify-center" style={{ width: 90, height: 120 }}>
                      <div className="text-neutral-400 text-[10px]">{activeItem.fileName} p{activeItem.page}</div>
                    </div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
