import { RotateCcw } from 'lucide-react';
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
import type { ProjectScript } from '../../apis/script';
import type { Actor, Feedback } from '../../types/feedback';
import { getScriptActorColorById } from '../../utils/scriptFeedbackStyle';
import LoadingSpinner from '../LoadingSpinner';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type ScriptReviewPdfViewerProps = {
  script: ProjectScript;
  feedbacks: Feedback[];
  actors: Actor[];
};

type ScriptReviewStatus = 'loading' | 'ready' | 'error';

type PageViewportRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const hasValidAnchor = (feedback: Feedback): feedback is Feedback & {
  scriptPage: number;
  scriptX: number;
  scriptY: number;
} =>
  typeof feedback.scriptPage === 'number' &&
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

function ScriptReviewPdfPage({
  document,
  pageNumber,
  containerWidth,
  markers,
  actors,
  pinnedFeedbackId,
  onPinnedFeedbackToggle,
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
  actors: Actor[];
  pinnedFeedbackId: number | null;
  onPinnedFeedbackToggle: (feedback: Feedback) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageElementRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [hoveredFeedbackId, setHoveredFeedbackId] = useState<number | null>(
    null,
  );
  const [pageRect, setPageRect] = useState<PageViewportRect | null>(null);

  const updatePageRect = useCallback(() => {
    const rect = pageElementRef.current?.getBoundingClientRect();

    if (!rect) {
      setPageRect(null);
      return;
    }

    setPageRect({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }, []);

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
          setIsRendering(false);
          updatePageRect();
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
  }, [containerWidth, document, pageNumber, updatePageRect]);

  useEffect(() => {
    if (isRendering) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(updatePageRect);

    window.addEventListener('resize', updatePageRect);
    window.addEventListener('scroll', updatePageRect, true);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updatePageRect);
      window.removeEventListener('scroll', updatePageRect, true);
    };
  }, [isRendering, updatePageRect]);

  const getMarkerViewportPosition = (feedback: Feedback) => {
    if (!hasValidAnchor(feedback) || !pageRect) {
      return null;
    }

    return {
      left: pageRect.left + feedback.scriptX * pageRect.width + 18,
      top: pageRect.top + feedback.scriptY * pageRect.height,
    };
  };

  return (
    <div
      ref={pageElementRef}
      className="relative mx-auto w-full max-w-full"
    >
      <canvas
        ref={canvasRef}
        className="block w-full rounded-[8px] bg-white shadow-[0_18px_48px_rgba(0,0,0,0.2)]"
      />

      {!isRendering &&
        markers.map((feedback) => {
          const markerColor = getScriptActorColorById(
            actors,
            feedback.actorIds[0],
          );
          const isPinned = pinnedFeedbackId === feedback.id;
          const isOpen = isPinned || hoveredFeedbackId === feedback.id;
          const position = isOpen ? getMarkerViewportPosition(feedback) : null;
          const actorNames =
            feedback.actorNames && feedback.actorNames.length > 0
              ? feedback.actorNames.join(', ')
              : '배우 미지정';

          return (
            <div
              key={feedback.id}
              className="absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
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
                  onPinnedFeedbackToggle(feedback);
                }}
                className={[
                  'h-3.5 w-3.5 rounded-full border border-white transition duration-200 focus:outline-none focus-visible:ring-2',
                  isOpen
                    ? 'scale-125'
                    : 'hover:scale-125',
                ].join(' ')}
                style={{
                  backgroundColor: markerColor,
                  boxShadow: isOpen
                    ? `0 0 10px ${markerColor}, 0 0 26px ${markerColor}d9, 0 0 52px ${markerColor}8c`
                    : `0 0 12px ${markerColor}91, 0 0 24px ${markerColor}52`,
                }}
                aria-label="대본 피드백 보기"
                onFocus={updatePageRect}
                onPointerEnter={updatePageRect}
              />

              {isOpen &&
                position &&
                createPortal(
                  <button
                    type="button"
                    className="script-feedback-bubble reaction-ui-font pointer-events-auto fixed z-[9999] w-72 origin-left rounded-[22px] rounded-bl-[8px] border border-white/24 px-4 py-3 text-left text-white opacity-100 shadow-[0_18px_40px_rgba(0,0,0,0.24)] transition duration-200"
                    style={{
                      left: position.left,
                      top: position.top,
                      transform: 'translateY(-50%)',
                      backgroundColor: markerColor,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isPinned) {
                        onPinnedFeedbackToggle(feedback);
                      }
                    }}
                  >
                    <span
                      className="absolute left-[-9px] top-1/2 h-5 w-5 -translate-y-1/2 rotate-45 rounded-[4px]"
                      style={{ backgroundColor: markerColor }}
                      aria-hidden="true"
                    />
                    <div className="relative mb-1 flex min-w-0 items-center gap-1.5 text-[10px] font-black text-white/82">
                      <time className="shrink-0">{feedback.timestamp}</time>
                      <span className="text-white/44">|</span>
                      <span className="truncate">{actorNames}</span>
                      {isPinned && (
                        <span className="ml-auto shrink-0 rounded-full bg-white/18 px-1.5 py-0.5 text-[9px] text-white">
                          고정
                        </span>
                      )}
                    </div>
                    <p className="relative whitespace-pre-wrap break-words text-[11px] font-bold leading-relaxed text-white [overflow-wrap:anywhere]">
                      {feedback.content}
                    </p>
                  </button>,
                  globalThis.document.body,
                )}
            </div>
          );
        })}
    </div>
  );
}

export default function ScriptReviewPdfViewer({
  script,
  feedbacks,
  actors,
}: ScriptReviewPdfViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ScriptReviewStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [pinnedFeedbackId, setPinnedFeedbackId] = useState<number | null>(null);
  const [, refreshOverlayPosition] = useState(0);

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
        860,
        Math.max(260, scrollContainer.clientWidth - 32),
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
      setPinnedFeedbackId(null);

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

  const togglePinnedFeedback = (feedback: Feedback) => {
    setPinnedFeedbackId((currentId) =>
      currentId === feedback.id ? null : feedback.id,
    );
  };

  return (
    <section className="reaction-ui-font flex h-full min-h-0 w-full max-w-[940px] flex-col overflow-hidden rounded-[8px] border border-white/20 bg-[#1b0708]/24 text-[#eee7dc] shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-sm">
      <div
        ref={scrollContainerRef}
        className="reaction-hidden-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5"
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
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/12 px-4 py-2 text-xs font-bold text-[#eee7dc] transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <RotateCcw size={13} strokeWidth={2.5} aria-hidden="true" />
                다시 시도
              </button>
            </div>
          </div>
        )}

        {status === 'ready' && document && (
          <div className="relative mx-auto flex w-full max-w-[860px] flex-col gap-5">
            {Array.from({ length: document.numPages }, (_, index) => {
              const pageNumber = index + 1;

              return (
                <ScriptReviewPdfPage
                  key={pageNumber}
                  document={document}
                  pageNumber={pageNumber}
                  containerWidth={containerWidth}
                  markers={feedbackMarkers.filter(
                    (feedback) => feedback.scriptPage === pageNumber,
                  )}
                  actors={actors}
                  pinnedFeedbackId={pinnedFeedbackId}
                  onPinnedFeedbackToggle={togglePinnedFeedback}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
