import { useState } from 'react';
// 타입 정의
import type { Actor, Feedback } from '../types/feedback';
const actors: Actor[] = [
  //나중에 백엔드 연결해오기!
  { id: 1, name: '이예나', shortcut: 'O' },
  { id: 2, name: '조현정', shortcut: 'I' },
  { id: 3, name: '오지원', shortcut: 'P' },
  { id: 4, name: 'XXX', shortcut: 'O' },
  { id: 5, name: 'YYY', shortcut: 'P' },
];

export default function RehearsalFeedbackPage() {
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleStartTimestamp = () => {
    const now = new Date();
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    setTimestamp(`${mm}:${ss}`);
  };

  const handleSubmit = () => {
    if (!selectedActor || !timestamp || !content.trim()) return;

    if (editingId) {
      setFeedbacks((prev) =>
        prev.map((item) =>
          item.id === editingId ? { ...item, content } : item,
        ),
      );
      setEditingId(null);
    } else {
      setFeedbacks((prev) => [
        ...prev,
        {
          id: Date.now(),
          timestamp,
          actorId: selectedActor.id,
          content,
        },
      ]);
    }

    setContent('');
    setTimestamp(null);
  };

  const handleEdit = (feedback: Feedback) => {
    setEditingId(feedback.id);
    setTimestamp(feedback.timestamp);
    setSelectedActor(
      actors.find((actor) => actor.id === feedback.actorId) ?? null,
    );
    setContent(feedback.content);
  };

  const handleDelete = (id: number) => {
    setFeedbacks((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <main className="min-h-screen bg-neutral-100 p-4 md:p-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]">
        <section className="flex flex-col gap-4">
          <MovementArea />

          <ActorTagBar
            actors={actors}
            selectedActor={selectedActor}
            onSelect={setSelectedActor}
          />
        </section>

        <FeedbackPanel
          feedbacks={feedbacks}
          selectedActor={selectedActor}
          timestamp={timestamp}
          content={content}
          editingId={editingId}
          onTimestampStart={handleStartTimestamp}
          onContentChange={setContent}
          onSubmit={handleSubmit}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </main>
  );
}

function MovementArea() {
  return (
    <section className="min-h-[360px] rounded-3xl bg-neutral-300 p-6 md:min-h-[520px]">
      <div className="h-full rounded-2xl border border-dashed border-neutral-400 bg-neutral-400/20" />
    </section>
  );
}

type ActorTagBarProps = {
  actors: Actor[];
  selectedActor: Actor | null;
  onSelect: (actor: Actor) => void;
};

function ActorTagBar({ actors, selectedActor, onSelect }: ActorTagBarProps) {
  return (
    <section className="rounded-3xl bg-neutral-300 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="shrink-0 border-b border-neutral-500 pb-3 text-center text-sm font-medium text-neutral-500 md:border-b-0 md:border-r md:pb-0 md:pr-5">
          ACTOR
          <br />
          TAG
        </div>

        <div className="flex flex-wrap gap-3">
          {actors.map((actor) => {
            const isSelected = selectedActor?.id === actor.id;

            return (
              <button
                key={actor.id}
                onClick={() => onSelect(actor)}
                className={[
                  'rounded-xl px-4 py-2 text-sm transition',
                  isSelected
                    ? 'bg-neutral-700 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-white',
                ].join(' ')}
              >
                <div className="font-semibold">{actor.name}</div>
                <div className="text-xs opacity-70">“{actor.shortcut}”</div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type FeedbackPanelProps = {
  feedbacks: Feedback[];
  selectedActor: Actor | null;
  timestamp: string | null;
  content: string;
  editingId: number | null;
  onTimestampStart: () => void;
  onContentChange: (value: string) => void;
  onSubmit: () => void;
  onEdit: (feedback: Feedback) => void;
  onDelete: (id: number) => void;
};

function FeedbackPanel({
  feedbacks,
  selectedActor,
  timestamp,
  content,
  editingId,
  onTimestampStart,
  onContentChange,
  onSubmit,
  onEdit,
  onDelete,
}: FeedbackPanelProps) {
  return (
    <aside className="flex min-h-[520px] flex-col rounded-3xl bg-neutral-200 p-5">
      <div className="flex-1 space-y-3 overflow-y-auto">
        {feedbacks.map((feedback) => (
          <div
            key={feedback.id}
            className="group rounded-2xl bg-white/60 p-3 text-sm text-neutral-700"
          >
            <div className="mb-1 flex items-center gap-2 text-neutral-500">
              <span>{feedback.timestamp}</span>
              <span>|</span>
              <span className="font-semibold text-neutral-700">
                {feedback.actorId}
              </span>
            </div>

            <p className="whitespace-pre-wrap">{feedback.content}</p>

            <div className="mt-2 flex gap-2 text-xs text-neutral-500 opacity-100 md:opacity-0 md:group-hover:opacity-100">
              <button onClick={() => onEdit(feedback)}>수정</button>
              <button onClick={() => onDelete(feedback.id)}>삭제</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-neutral-400 bg-neutral-100 p-3">
        <div className="mb-2 flex flex-wrap gap-2 text-xs text-neutral-500">
          <button
            onClick={onTimestampStart}
            className="rounded-full bg-white px-3 py-1"
          >
            Space 시점 기록
          </button>

          <span>
            {timestamp ?? '--:--'} | {selectedActor?.name ?? '배우 선택 필요'}
          </span>
        </div>

        <div className="flex gap-2">
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="피드백을 입력하세요"
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none"
          />

          <button
            onClick={onSubmit}
            className="rounded-xl bg-neutral-800 px-4 text-sm font-medium text-white disabled:bg-neutral-400"
            disabled={!selectedActor || !timestamp || !content.trim()}
          >
            {editingId ? '저장' : '등록'}
          </button>
        </div>
      </div>
    </aside>
  );
}
