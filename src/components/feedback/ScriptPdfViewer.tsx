import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as pdfjsLib from 'pdfjs-dist';
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { updateFeedbackV2 } from '../../apis/feedback';
import type { ProjectScript } from '../../apis/script';
import LoadingSpinner from '../LoadingSpinner';
import type { FeedbackV2Response } from '../../apis/feedback';
import type { Actor, Feedback } from '../../types/feedback';
import ScriptFeedbackComposer from './ScriptFeedbackComposer';
import type { ScriptFeedbackDraftAnchor } from './ScriptFeedbackComposer';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type ScriptPdfViewerStatus = 'loading' | 'ready' | 'error';

type ScriptPdfViewerProps = {
  script: ProjectScript;
  sessionId: number;
  userId: number | null;
  actors: Actor[];
  disabled?: boolean;
  selectedFeedback: Feedback | null;
  selectionVersion: number;
  feedbacks: Feedback[];
  draftContent: string;
  getCurrentOffsetSeconds: () => number;
  onDraftContentChange: (content: string) => void;
  onDraftOpenChange: (isOpen: boolean) => void;
  onFeedbackSelect: (feedback: Feedback) => void;
  onFeedbackUpdated: (feedback: FeedbackV2Response) => void;
  onFeedbackDelete: (feedback: Feedback) => Promise<void> | void;
  onFeedbackCreated: (feedback: FeedbackV2Response) => void;
};

type ScriptAnchor = {
  page: number;
  x: number;
  y: number;
};

type PageRenderSize = {
  width: number;
  height: number;
};

const hasValidAnchor = (feedback: Feedback | null): feedback is Feedback & {
  scriptPage: number;
  scriptX: number;
  scriptY: number;
} =>
  typeof feedback?.scriptPage === 'number' &&
  Number.isFinite(feedback.scriptPage) &&
  feedback.scriptPage >= 1 &&
  typeof feedback.scriptX === 'number' &&
  Number.isFinite(feedback.scriptX) &&
  feedback.scriptX >= 0 &&
  feedback.scriptX <= 1 &&
  typeof feedback.scriptY === 'number' &&
  Number.isFinite(feedback.scriptY) &&
  feedback.scriptY >= 0 &&
  feedback.scriptY <= 1;

const timestampToSeconds = (value: string) => {
  const [minutes = '0', seconds = '0'] = value.split(':');

  return Number(minutes) * 60 + Number(seconds);
};

function ScriptPdfPage({
  document,
  pageNumber,
  containerWidth,
  markers,
  selectedFeedbackId,
  pageRef,
  onSizeChange,
  onPageClick,
  onFeedbackSelect,
  onFeedbackUpdated,
  onFeedbackDelete,
  sessionId,
  userId,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
  containerWidth: number;
  markers: Array<
    Feedback & {
      scriptPage: number;
      scriptX: number;
      scriptY: number;
    }
  >;
  selectedFeedbackId: number | null;
  pageRef: (element: HTMLDivElement | null) => void;
  onSizeChange: (pageNumber: number, size: PageRenderSize) => void;
  onPageClick: (anchor: {
    page: number;
    x: number;
    y: number;
    viewportLeft: number;
    viewportTop: number;
  }) => void;
  onFeedbackSelect: (feedback: Feedback) => void;
  onFeedbackUpdated: (feedback: FeedbackV2Response) => void;
  onFeedbackDelete: (feedback: Feedback) => Promise<void> | void;
  sessionId: number;
  userId: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const pageElementRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [hoveredFeedbackId, setHoveredFeedbackId] = useState<number | null>(
    null,
  );
  const [editingFeedbackId, setEditingFeedbackId] = useState<number | null>(
    null,
  );
  const [editingContent, setEditingContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Feedback | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState('');

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget || isMutating) {
      return;
    }

    setIsMutating(true);
    setMutationError('');

    try {
      await onFeedbackDelete(deleteTarget);
      setDeleteTarget(null);
    } catch {
      setMutationError('피드백을 삭제하지 못했습니다.');
    } finally {
      setIsMutating(false);
    }
  }, [deleteTarget, isMutating, onFeedbackDelete]);

  useEffect(() => {
    if (editingFeedbackId !== null) {
      requestAnimationFrame(() => {
        editTextareaRef.current?.focus();
      });
    }
  }, [editingFeedbackId]);

  useEffect(() => {
    if (!deleteTarget) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void handleDeleteConfirm();
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setDeleteTarget(null);
        setMutationError('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteTarget, handleDeleteConfirm]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || containerWidth <= 0) {
      return;
    }

    let cancelled = false;

    const renderPage = async () => {
      setIsRendering(true);

      try {
        const page: PDFPageProxy = await document.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;
        const context = canvas.getContext('2d');

        if (!context || cancelled) {
          return;
        }

        renderTaskRef.current?.cancel();
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!cancelled) {
          onSizeChange(pageNumber, {
            width: viewport.width,
            height: viewport.height,
          });
          setIsRendering(false);
        }
      } catch (error) {
        if (
          !cancelled &&
          !(error instanceof Error && error.name === 'RenderingCancelledException')
        ) {
          setIsRendering(false);
        }
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [containerWidth, document, onSizeChange, pageNumber]);

  const startEdit = (feedback: Feedback) => {
    setMutationError('');
    setEditingFeedbackId(feedback.id);
    setEditingContent(feedback.content);
  };

  const saveEdit = async (feedback: Feedback) => {
    if (
      isMutating ||
      userId === null ||
      !editingContent.trim() ||
      !hasValidAnchor(feedback)
    ) {
      return;
    }

    setIsMutating(true);
    setMutationError('');

    try {
      const updatedFeedback = await updateFeedbackV2(
        sessionId,
        feedback.id,
        {
          content: editingContent.trim(),
          video_offset_seconds: timestampToSeconds(feedback.timestamp),
          actor_ids: feedback.actorIds,
          script_page: feedback.scriptPage,
          script_x: feedback.scriptX,
          script_y: feedback.scriptY,
        },
        userId,
      );

      onFeedbackUpdated(updatedFeedback);
      setEditingFeedbackId(null);
      setEditingContent('');
    } catch {
      setMutationError('피드백을 수정하지 못했습니다.');
    } finally {
      setIsMutating(false);
    }
  };

  const getMarkerViewportPosition = (feedback: Feedback) => {
    if (!hasValidAnchor(feedback) || !pageElementRef.current) {
      return null;
    }

    const rect = pageElementRef.current.getBoundingClientRect();

    return {
      left: rect.left + feedback.scriptX * rect.width + 16,
      top: rect.top + feedback.scriptY * rect.height,
    };
  };

  return (
    <div
      ref={(element) => {
        pageElementRef.current = element;
        pageRef(element);
      }}
      className="relative mx-auto w-full max-w-full"
      onClick={(event) => {
        const canvas = canvasRef.current;

        if (!canvas || isRendering) {
          return;
        }

        const rect = canvas.getBoundingClientRect();
        const clickedX = event.clientX - rect.left;
        const clickedY = event.clientY - rect.top;

        if (
          clickedX < 0 ||
          clickedY < 0 ||
          clickedX > rect.width ||
          clickedY > rect.height
        ) {
          return;
        }

        onPageClick({
          page: pageNumber,
          x: Math.min(1, Math.max(0, clickedX / rect.width)),
          y: Math.min(1, Math.max(0, clickedY / rect.height)),
          viewportLeft: event.clientX,
          viewportTop: event.clientY,
        });
      }}
    >
      <canvas className="block w-full rounded-[8px] bg-white shadow-[0_10px_26px_rgba(0,0,0,0.18)]" ref={canvasRef} />
      {markers.map((feedback) => {
        const isSelected = selectedFeedbackId === feedback.id;
        const isEditing = editingFeedbackId === feedback.id;

        return (
          <div
            key={feedback.id}
            className="group absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{
              left: `${feedback.scriptX * 100}%`,
              top: `${feedback.scriptY * 100}%`,
            }}
          >
            <button
              type="button"
              onMouseEnter={() => setHoveredFeedbackId(feedback.id)}
              onMouseLeave={() => setHoveredFeedbackId(null)}
              onClick={(event) => {
                event.stopPropagation();
                onFeedbackSelect(feedback);
              }}
              className={[
                'h-3 w-3 rounded-full border border-white bg-[#D15757] transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D15757]/70',
                isSelected
                  ? 'scale-125 shadow-[0_0_0_6px_rgba(209,87,87,0.24),0_0_20px_rgba(209,87,87,0.52)]'
                  : 'shadow-[0_0_0_4px_rgba(209,87,87,0.16)] group-hover:scale-125 group-hover:shadow-[0_0_0_6px_rgba(209,87,87,0.24),0_0_20px_rgba(209,87,87,0.52)]',
              ].join(' ')}
              aria-label="대본 피드백 보기"
            />

            {(isSelected || isEditing || hoveredFeedbackId === feedback.id) &&
              (() => {
                const position = getMarkerViewportPosition(feedback);

                if (!position) {
                  return null;
                }

                return createPortal(
                  <div
                    className="pointer-events-auto fixed z-[9999] w-64 origin-left rounded-[8px] border border-[#d5c8bc] bg-[#efe6de] px-3 py-2 text-left text-[#2d1715] opacity-100 shadow-[0_18px_40px_rgba(0,0,0,0.22)] transition duration-200"
                    style={{
                      left: position.left,
                      top: position.top,
                      transform: 'translateY(-50%)',
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-black">
                        <span>{feedback.timestamp}</span>
                        {feedback.actorNames && feedback.actorNames.length > 0 && (
                          <>
                            <span>|</span>
                            <span className="truncate">
                              {feedback.actorNames.join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void saveEdit(feedback)}
                              disabled={isMutating || !editingContent.trim()}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2F8F5B] text-white transition hover:scale-105 disabled:opacity-45"
                              aria-label="수정 저장"
                            >
                              <Check size={13} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFeedbackId(null);
                                setEditingContent('');
                                setMutationError('');
                              }}
                              disabled={isMutating}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#806b61]/18 text-[#604942] transition hover:scale-105 disabled:opacity-45"
                              aria-label="수정 취소"
                            >
                              <X size={13} strokeWidth={2.5} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(feedback)}
                              disabled={isMutating || userId === null}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B6EA6] text-white transition hover:scale-105 disabled:opacity-45"
                              aria-label="피드백 수정"
                            >
                              <Pencil size={12} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMutationError('');
                                setDeleteTarget(feedback);
                              }}
                              disabled={isMutating}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D15757] text-white transition hover:scale-105 disabled:opacity-45"
                              aria-label="피드백 삭제"
                            >
                              <Trash2 size={12} strokeWidth={2.5} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        ref={editTextareaRef}
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        onKeyDown={(event) => {
                          if (
                            event.key === 'Enter' &&
                            !event.shiftKey &&
                            !event.nativeEvent.isComposing
                          ) {
                            event.preventDefault();
                            void saveEdit(feedback);
                          }
                        }}
                        disabled={isMutating}
                        className="max-h-28 min-h-16 w-full resize-none rounded-[8px] border border-[#c8b7aa] bg-[#fff8ef] px-2 py-1.5 text-[11px] font-bold leading-relaxed text-[#2d1715] outline-none focus:border-[#431B1B] focus:ring-2 focus:ring-[#431B1B]/15 disabled:opacity-60"
                      />
                    ) : (
                      <p className="line-clamp-4 whitespace-pre-wrap text-[11px] font-bold leading-relaxed">
                        {feedback.content}
                      </p>
                    )}

                    {mutationError && (
                      <p className="mt-1 text-[10px] font-bold text-[#D15757]">
                        {mutationError}
                      </p>
                    )}
                  </div>,
                  globalThis.document.body,
                );
              })()}
          </div>
        );
      })}

      {deleteTarget &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/22 px-4 backdrop-blur-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="w-72 max-w-full rounded-[12px] border border-white/35 bg-[#efe6de] p-5 text-center text-[#2d1715] shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
              <p className="text-sm font-black">피드백을 삭제합니다.</p>
              {mutationError && (
                <p className="mt-2 text-xs font-bold text-[#D15757]">
                  {mutationError}
                </p>
              )}
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDeleteConfirm()}
                  disabled={isMutating}
                  className="rounded-full bg-[#D15757] px-4 py-2 text-xs font-black text-white transition hover:bg-[#bb4646] disabled:opacity-45"
                >
                  삭제
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(null);
                    setMutationError('');
                  }}
                  disabled={isMutating}
                  className="rounded-full border border-[#c8b7aa] bg-white/40 px-4 py-2 text-xs font-black text-[#604942] transition hover:bg-white/60 disabled:opacity-45"
                >
                  취소
                </button>
              </div>
            </div>
          </div>,
          globalThis.document.body,
        )}
    </div>
  );
}

export default function ScriptPdfViewer({
  script,
  sessionId,
  userId,
  actors,
  disabled = false,
  selectedFeedback,
  selectionVersion,
  feedbacks,
  draftContent,
  getCurrentOffsetSeconds,
  onDraftContentChange,
  onDraftOpenChange,
  onFeedbackSelect,
  onFeedbackUpdated,
  onFeedbackDelete,
  onFeedbackCreated,
}: ScriptPdfViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pagesWrapperRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const [status, setStatus] = useState<ScriptPdfViewerStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageSizes, setPageSizes] = useState(new Map<number, PageRenderSize>());
  const [retryCount, setRetryCount] = useState(0);
  const [, refreshOverlayPosition] = useState(0);
  const [draftAnchor, setDraftAnchor] =
    useState<ScriptFeedbackDraftAnchor | null>(null);

  const selectedAnchor = useMemo<ScriptAnchor | null>(() => {
    if (!hasValidAnchor(selectedFeedback)) {
      return null;
    }

    return {
      page: selectedFeedback.scriptPage,
      x: selectedFeedback.scriptX,
      y: selectedFeedback.scriptY,
    };
  }, [selectedFeedback]);
  const feedbackMarkers = useMemo(
    () => feedbacks.filter(hasValidAnchor),
    [feedbacks],
  );

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const updateWidth = () => {
      const nextWidth = Math.min(
        820,
        Math.max(240, scrollContainer.clientWidth - 28),
      );
      setContainerWidth(nextWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(scrollContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    let animationFrameId = 0;
    const updateOverlayPosition = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(() => {
        refreshOverlayPosition((version) => version + 1);
      });
    };

    scrollContainer.addEventListener('scroll', updateOverlayPosition, {
      passive: true,
    });
    window.addEventListener('resize', updateOverlayPosition);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      scrollContainer.removeEventListener('scroll', updateOverlayPosition);
      window.removeEventListener('resize', updateOverlayPosition);
    };
  }, []);

  useEffect(() => {
    if (!script.url) {
      return;
    }

    let loadingTask: PDFDocumentLoadingTask | null = null;
    let ignore = false;

    const loadDocument = async () => {
      setStatus('loading');
      setErrorMessage('');
      setDocument(null);
      setPageSizes(new Map());

      loadingTask = pdfjsLib.getDocument({
        url: script.url,
        withCredentials: false,
      });

      try {
        const nextDocument = await loadingTask.promise;

        if (ignore) {
          return;
        }

        setDocument(nextDocument);
        setStatus('ready');
      } catch (error) {
        if (ignore) {
          return;
        }

        setStatus('error');
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'PDF 파일을 열지 못했습니다.',
        );
      }
    };

    void loadDocument();

    return () => {
      ignore = true;
      loadingTask?.destroy();
      loadingTask = null;
    };
  }, [retryCount, script.url]);

  useEffect(() => {
    if (!selectedAnchor || !scrollContainerRef.current) {
      return;
    }

    const pageElement = pageRefs.current.get(selectedAnchor.page);
    const pageSize = pageSizes.get(selectedAnchor.page);

    if (!pageElement || !pageSize) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    const targetTop =
      pageElement.offsetTop +
      selectedAnchor.y * pageSize.height -
      scrollContainer.clientHeight / 2;

    scrollContainer.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        refreshOverlayPosition((version) => version + 1);
      });
    });
  }, [pageSizes, selectedAnchor, selectionVersion]);

  const setPageRef = (pageNumber: number) => (element: HTMLDivElement | null) => {
    if (element) {
      pageRefs.current.set(pageNumber, element);
      return;
    }

    pageRefs.current.delete(pageNumber);
  };

  const handleSizeChange = (pageNumber: number, size: PageRenderSize) => {
    setPageSizes((currentSizes) => {
      const currentSize = currentSizes.get(pageNumber);

      if (
        currentSize &&
        currentSize.width === size.width &&
        currentSize.height === size.height
      ) {
        return currentSizes;
      }

      const nextSizes = new Map(currentSizes);
      nextSizes.set(pageNumber, size);

      return nextSizes;
    });
  };

  const handlePageClick = ({
    page,
    x,
    y,
    viewportLeft,
    viewportTop,
  }: {
    page: number;
    x: number;
    y: number;
    viewportLeft: number;
    viewportTop: number;
  }) => {
    if (disabled || Number.isNaN(sessionId)) {
      return;
    }

    const pageElement = pageRefs.current.get(page);
    const pageSize = pageSizes.get(page);

    if (!pageElement || !pageSize) {
      return;
    }

    setDraftAnchor({
      page,
      x,
      y,
      left: pageElement.offsetLeft + x * pageSize.width,
      top: pageElement.offsetTop + y * pageSize.height,
      viewportLeft,
      viewportTop,
      videoOffsetSeconds: getCurrentOffsetSeconds(),
    });
    onDraftContentChange('');
    onDraftOpenChange(true);
  };

  const closeDraft = () => {
    setDraftAnchor(null);
    onDraftContentChange('');
    onDraftOpenChange(false);
  };

  return (
    <section className="reaction-ui-font flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-white/20 bg-[#1b0708]/24 text-[#eee7dc] shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-sm">
      <div
        ref={scrollContainerRef}
        className="reaction-hidden-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4"
      >
        {status === 'loading' && (
          <div className="flex h-full min-h-[360px] items-center justify-center">
            <LoadingSpinner label="대본을 불러오는 중입니다" />
          </div>
        )}

        {status === 'error' && (
          <div className="flex h-full min-h-[360px] items-center justify-center px-6 text-center">
            <div>
              <p className="text-base font-bold">대본을 표시하지 못했습니다.</p>
              <p className="mt-2 text-sm font-semibold text-[#bcb2aa]">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-4 rounded-full border border-white/35 bg-white/12 px-4 py-2 text-xs font-bold text-[#eee7dc] transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {status === 'ready' && document && (
          <div
            ref={pagesWrapperRef}
            className="relative mx-auto flex w-full max-w-[820px] flex-col gap-5"
          >
            {Array.from({ length: document.numPages }, (_, index) => {
              const pageNumber = index + 1;

              return (
                <ScriptPdfPage
                  key={pageNumber}
                  document={document}
                  pageNumber={pageNumber}
                  containerWidth={containerWidth}
                  markers={feedbackMarkers.filter(
                    (feedback) => feedback.scriptPage === pageNumber,
                  )}
                  selectedFeedbackId={selectedFeedback?.id ?? null}
                  pageRef={setPageRef(pageNumber)}
                  onSizeChange={handleSizeChange}
                  onPageClick={handlePageClick}
                  onFeedbackSelect={onFeedbackSelect}
                  onFeedbackUpdated={onFeedbackUpdated}
                  onFeedbackDelete={onFeedbackDelete}
                  sessionId={sessionId}
                  userId={userId}
                />
              );
            })}

            {draftAnchor &&
              createPortal(
                <div className="pointer-events-none fixed inset-0 z-[9999]">
                  <ScriptFeedbackComposer
                    anchor={{
                      ...draftAnchor,
                      left: draftAnchor.viewportLeft,
                      top: draftAnchor.viewportTop,
                    }}
                    actors={actors}
                    sessionId={sessionId}
                    userId={userId}
                    content={draftContent}
                    disabled={disabled}
                    onContentChange={onDraftContentChange}
                    onCreated={onFeedbackCreated}
                    onCancel={closeDraft}
                  />
                </div>,
                globalThis.document.body,
              )}
          </div>
        )}
      </div>
    </section>
  );
}
