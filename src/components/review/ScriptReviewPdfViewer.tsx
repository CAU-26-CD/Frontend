import { Pin, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  getFeedbackActorNames,
  getFeedbackPriorityColor,
} from '../../utils/scriptFeedbackStyle';
import LoadingSpinner from '../LoadingSpinner';
import type { ReviewFeedbackTag } from './ReviewFilterBar';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type ScriptReviewPdfViewerProps = {
  script: ProjectScript;
  feedbacks: Feedback[];
  actors: Actor[];
  feedbackTags: ReviewFeedbackTag[];
  feedbackNavigationRequest?: {
    id: number;
    feedbackId: number;
  } | null;
  scrollProgressRequest?: {
    id: number;
    progress: number;
  } | null;
  onPageCountChange?: (pageCount: number) => void;
  onScrollProgressChange?: (progress: number) => void;
  onSelectedFeedbackChange?: (feedbackId: number | null) => void;
};

type ScriptReviewStatus = 'loading' | 'ready' | 'error';

const FEEDBACK_BUBBLE_EXIT_MS = 110;
const FEEDBACK_BUBBLE_CLOSE_DELAY_MS = 160;
const FEEDBACK_BUBBLE_WIDTH = 288;
const FEEDBACK_BUBBLE_MIN_WIDTH = 180;
const FEEDBACK_MARKER_CONTAINER_SIZE = 32;
const FEEDBACK_MARKER_DOT_SIZE = 14;
const FEEDBACK_BUBBLE_GAP = 8;
const FEEDBACK_BUBBLE_PAGE_MARGIN = 8;
const FEEDBACK_BUBBLE_RIGHT_OFFSET =
  FEEDBACK_MARKER_CONTAINER_SIZE / 2 +
  FEEDBACK_MARKER_DOT_SIZE / 2 +
  FEEDBACK_BUBBLE_GAP;
const FEEDBACK_BUBBLE_LEFT_OFFSET =
  FEEDBACK_MARKER_CONTAINER_SIZE / 2 -
  FEEDBACK_MARKER_DOT_SIZE / 2 -
  FEEDBACK_BUBBLE_GAP;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getFeedbackCategoryTags = (
  feedbackCategories: string[],
  feedbackTags: ReviewFeedbackTag[],
) =>
  feedbackTags.filter((tag) =>
    feedbackCategories.some(
      (category) => category === tag.id || tag.values.includes(category),
    ),
  );

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
  feedbackTags,
  pinnedFeedbackIds,
  transientFeedbackId,
  onPinnedFeedbackToggle,
  onTransientFeedbackOpen,
  onTransientFeedbackClose,
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
  feedbackTags: ReviewFeedbackTag[];
  pinnedFeedbackIds: number[];
  transientFeedbackId: number | null;
  onPinnedFeedbackToggle: (feedback: Feedback) => void;
  onTransientFeedbackOpen: (feedback: Feedback) => void;
  onTransientFeedbackClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageElementRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [hoveredFeedbackId, setHoveredFeedbackId] = useState<number | null>(
    null,
  );
  const [closingBubbleFeedbackId, setClosingBubbleFeedbackId] = useState<
    number | null
  >(null);
  const bubbleCloseTimeoutRef = useRef<number | null>(null);

  const clearBubbleCloseTimeout = useCallback(() => {
    if (bubbleCloseTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(bubbleCloseTimeoutRef.current);
    bubbleCloseTimeoutRef.current = null;
  }, []);

  const closeBubbleWithAnimation = useCallback(
    (feedbackId: number) => {
      clearBubbleCloseTimeout();
      bubbleCloseTimeoutRef.current = window.setTimeout(() => {
        setHoveredFeedbackId((currentId) =>
          currentId === feedbackId ? null : currentId,
        );
        setClosingBubbleFeedbackId(feedbackId);
        bubbleCloseTimeoutRef.current = window.setTimeout(() => {
          setClosingBubbleFeedbackId((currentId) =>
            currentId === feedbackId ? null : currentId,
          );
          bubbleCloseTimeoutRef.current = null;
        }, FEEDBACK_BUBBLE_EXIT_MS);
      }, FEEDBACK_BUBBLE_CLOSE_DELAY_MS);
    },
    [clearBubbleCloseTimeout],
  );

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
  }, [containerWidth, document, pageNumber]);

  useEffect(() => clearBubbleCloseTimeout, [clearBubbleCloseTimeout]);

  return (
    <div
      ref={pageElementRef}
      data-script-review-page={pageNumber}
      className="relative mx-auto w-full max-w-full"
      onClick={onTransientFeedbackClose}
    >
      <canvas
        ref={canvasRef}
        className="block w-full rounded-[8px] bg-white shadow-[0_18px_48px_rgba(0,0,0,0.2)]"
      />

      {!isRendering &&
        markers.map((feedback) => {
          const markerColor = getFeedbackPriorityColor(feedback, '#6f625a');
          const isPinned = pinnedFeedbackIds.includes(feedback.id);
          const isTransient = transientFeedbackId === feedback.id;
          const isOpen =
            isPinned || isTransient || hoveredFeedbackId === feedback.id;
          const isBubbleVisible = isOpen || closingBubbleFeedbackId === feedback.id;
          const isBubbleClosing =
            closingBubbleFeedbackId === feedback.id && !isOpen;
          const actorNames =
            getFeedbackActorNames(feedback, actors) || '배우 미지정';
          const categoryTags = getFeedbackCategoryTags(
            feedback.categories ?? [],
            feedbackTags,
          );
          const markerCenterX = feedback.scriptX * containerWidth;
          const bubbleWidth = Math.min(
            FEEDBACK_BUBBLE_WIDTH,
            Math.max(
              FEEDBACK_BUBBLE_MIN_WIDTH,
              containerWidth - FEEDBACK_BUBBLE_PAGE_MARGIN * 2,
            ),
          );
          const unclampedBubbleLeft =
            markerCenterX + FEEDBACK_BUBBLE_RIGHT_OFFSET + bubbleWidth <=
            containerWidth
              ? FEEDBACK_BUBBLE_RIGHT_OFFSET
              : FEEDBACK_BUBBLE_LEFT_OFFSET - bubbleWidth;
          const minBubbleLeft =
            FEEDBACK_BUBBLE_PAGE_MARGIN - markerCenterX;
          const maxBubbleLeft =
            containerWidth -
            FEEDBACK_BUBBLE_PAGE_MARGIN -
            markerCenterX -
            bubbleWidth;
          const bubbleLeft = Math.min(
            maxBubbleLeft,
            Math.max(minBubbleLeft, unclampedBubbleLeft),
          );
          const markerDotLeft =
            FEEDBACK_MARKER_CONTAINER_SIZE / 2 - FEEDBACK_MARKER_DOT_SIZE / 2;
          const markerDotRight =
            FEEDBACK_MARKER_CONTAINER_SIZE / 2 + FEEDBACK_MARKER_DOT_SIZE / 2;
          const bubbleRight = bubbleLeft + bubbleWidth;
          const connectorLeft =
            bubbleLeft >= markerDotRight ? markerDotRight : bubbleRight;
          const connectorWidth =
            bubbleLeft >= markerDotRight
              ? bubbleLeft - markerDotRight
              : Math.max(0, markerDotLeft - bubbleRight);
          const bridgeLeft =
            bubbleLeft < 0 ? bubbleLeft + bubbleWidth : 0;
          const bridgeWidth =
            bubbleLeft < 0
              ? Math.max(0, 32 - bridgeLeft)
              : Math.max(0, bubbleLeft);

          return (
            <div
              key={feedback.id}
              data-script-feedback-marker-id={feedback.id}
              className="absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{
                left: `${feedback.scriptX * 100}%`,
                top: `${feedback.scriptY * 100}%`,
              }}
              onMouseEnter={() => {
                clearBubbleCloseTimeout();
                setClosingBubbleFeedbackId(null);
                setHoveredFeedbackId(feedback.id);
              }}
              onMouseLeave={() => {
                if (!isPinned && !isTransient) {
                  closeBubbleWithAnimation(feedback.id);
                }
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onTransientFeedbackOpen(feedback);
                }}
                className={[
                  'h-3.5 w-3.5 rounded-full border border-white transition duration-150 focus:outline-none focus-visible:ring-2',
                  isOpen
                    ? 'scale-110'
                    : 'hover:scale-110',
                ].join(' ')}
                style={{
                  backgroundColor: markerColor,
                  boxShadow: isOpen
                    ? `0 0 10px ${markerColor}, 0 0 26px ${markerColor}d9, 0 0 52px ${markerColor}8c`
                    : `0 0 12px ${markerColor}91, 0 0 24px ${markerColor}52`,
                }}
                aria-label="대본 피드백 보기"
              />

              {isBubbleVisible && (
                <>
                  <span
                    className="pointer-events-auto absolute top-[-48px] z-20 h-32"
                    style={{
                      left: bridgeLeft,
                      width: bridgeWidth,
                    }}
                    aria-hidden="true"
                  />
                  <div
                    className="pointer-events-none absolute top-1/2 z-20 h-px -translate-y-1/2 rounded-full"
                    style={{
                      left: connectorLeft,
                      width: connectorWidth,
                      backgroundColor: markerColor,
                      boxShadow: `0 0 6px ${markerColor}8c`,
                    }}
                    aria-hidden="true"
                  />
                  <div
                    className={[
                      'script-feedback-bubble reaction-ui-font pointer-events-auto absolute top-1/2 z-30 rounded-[14px] border text-left text-[#2d1715] opacity-100 shadow-[0_16px_34px_rgba(0,0,0,0.22)]',
                      isBubbleClosing ? 'script-feedback-bubble-out' : '',
                    ].join(' ')}
                    style={{
                      left: bubbleLeft,
                      width: bubbleWidth,
                      backgroundColor: 'rgba(255, 248, 239, 0.28)',
                      borderColor: markerColor,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <div className="relative" style={{ margin: '8px' }}>
                      <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] font-black leading-tight opacity-[0.85]">
                          <span className="truncate">{actorNames}</span>
                          <span className="opacity-45">|</span>
                          <time className="shrink-0">{feedback.timestamp}</time>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onPinnedFeedbackToggle(feedback);
                          }}
                          className={[
                            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                            isPinned
                              ? 'border-white/46 bg-white/28'
                              : 'border-white/26 bg-white/14 hover:bg-white/22',
                          ].join(' ')}
                          aria-pressed={isPinned}
                          aria-label={isPinned ? '피드백 고정 해제' : '피드백 고정'}
                          title={isPinned ? '피드백 고정 해제' : '피드백 고정'}
                        >
                          <Pin
                            size={10}
                            strokeWidth={2.6}
                            fill={isPinned ? 'currentColor' : 'none'}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                      <p className="relative whitespace-pre-wrap break-words text-[12px] font-black leading-tight [overflow-wrap:anywhere]">
                        {feedback.content}
                      </p>
                      {categoryTags.length > 0 && (
                        <div className="relative mt-0.5 flex min-w-0 flex-wrap justify-end gap-1">
                          {categoryTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex h-3.5 max-w-full items-center rounded-[4px] px-1.5 text-[9px] font-bold leading-none text-[#431B1B]"
                              style={{ backgroundColor: tag.color }}
                            >
                              <span className="truncate">{tag.label}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
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
  feedbackTags,
  feedbackNavigationRequest = null,
  scrollProgressRequest = null,
  onPageCountChange,
  onScrollProgressChange,
  onSelectedFeedbackChange,
}: ScriptReviewPdfViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ScriptReviewStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [pinnedFeedbackIds, setPinnedFeedbackIds] = useState<number[]>([]);
  const [transientFeedbackId, setTransientFeedbackId] = useState<number | null>(
    null,
  );

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
    if (!script.url) {
      return;
    }

    let loadingTask: PDFDocumentLoadingTask | null = null;
    let ignore = false;

    const loadDocument = async () => {
      setStatus('loading');
      setErrorMessage('');
      setDocument(null);
      setPinnedFeedbackIds([]);
      setTransientFeedbackId(null);

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
        onPageCountChange?.(nextDocument.numPages);
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
  }, [onPageCountChange, retryCount, script.url]);

  useEffect(() => {
    if (!feedbackNavigationRequest || status !== 'ready') {
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    const targetFeedback = feedbackMarkers.find(
      (feedback) => feedback.id === feedbackNavigationRequest.feedbackId,
    );

    if (!scrollContainer || !targetFeedback) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      setTransientFeedbackId(targetFeedback.id);
      onSelectedFeedbackChange?.(targetFeedback.id);

      const pageElement = scrollContainer.querySelector<HTMLElement>(
        `[data-script-review-page="${targetFeedback.scriptPage}"]`,
      );

      if (!pageElement) {
        return;
      }

      const targetTop =
        pageElement.offsetTop +
        pageElement.clientHeight * targetFeedback.scriptY -
        scrollContainer.clientHeight * 0.38;
      const maxScrollTop = Math.max(
        0,
        scrollContainer.scrollHeight - scrollContainer.clientHeight,
      );

      scrollContainer.scrollTo({
        behavior: 'smooth',
        top: clamp(targetTop, 0, maxScrollTop),
      });
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [
    feedbackMarkers,
    feedbackNavigationRequest,
    onSelectedFeedbackChange,
    status,
  ]);

  useEffect(() => {
    if (!scrollProgressRequest || status !== 'ready') {
      return;
    }

    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const maxScrollTop = Math.max(
      0,
      scrollContainer.scrollHeight - scrollContainer.clientHeight,
    );

    const animationFrame = window.requestAnimationFrame(() => {
      setTransientFeedbackId(null);
      scrollContainer.scrollTo({
        behavior: 'auto',
        top: maxScrollTop * clamp(scrollProgressRequest.progress, 0, 1),
      });
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [scrollProgressRequest, status]);

  useEffect(() => {
    if (!onScrollProgressChange) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const updateScrollProgress = () => {
      const maxScrollTop = Math.max(
        0,
        scrollContainer.scrollHeight - scrollContainer.clientHeight,
      );

      onScrollProgressChange(
        maxScrollTop === 0 ? 0 : scrollContainer.scrollTop / maxScrollTop,
      );
    };

    updateScrollProgress();

    const resizeObserver = new ResizeObserver(updateScrollProgress);
    resizeObserver.observe(scrollContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [document, onScrollProgressChange, status]);

  const togglePinnedFeedback = (feedback: Feedback) => {
    const isCurrentlyPinned = pinnedFeedbackIds.includes(feedback.id);

    setPinnedFeedbackIds((currentIds) =>
      currentIds.includes(feedback.id)
        ? currentIds.filter((feedbackId) => feedbackId !== feedback.id)
        : [...currentIds, feedback.id],
    );
    setTransientFeedbackId((currentId) =>
      currentId === feedback.id ? null : currentId,
    );
    onSelectedFeedbackChange?.(isCurrentlyPinned ? null : feedback.id);
  };

  const openTransientFeedback = (feedback: Feedback) => {
    setTransientFeedbackId(feedback.id);
    onSelectedFeedbackChange?.(feedback.id);
  };

  const handleScroll = () => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const maxScrollTop = Math.max(
      0,
      scrollContainer.scrollHeight - scrollContainer.clientHeight,
    );

    onScrollProgressChange?.(
      maxScrollTop === 0 ? 0 : scrollContainer.scrollTop / maxScrollTop,
    );
  };

  const closeTransientFeedback = () => {
    setTransientFeedbackId(null);
  };

  return (
    <section className="reaction-ui-font flex h-full min-h-0 w-full max-w-[940px] flex-col overflow-hidden rounded-[8px] border border-white/20 bg-[#1b0708]/24 text-[#eee7dc] shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-sm">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onWheel={closeTransientFeedback}
        onTouchStart={closeTransientFeedback}
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
                  feedbackTags={feedbackTags}
                  pinnedFeedbackIds={pinnedFeedbackIds}
                  transientFeedbackId={transientFeedbackId}
                  onPinnedFeedbackToggle={togglePinnedFeedback}
                  onTransientFeedbackOpen={openTransientFeedback}
                  onTransientFeedbackClose={closeTransientFeedback}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
