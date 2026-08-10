import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';

const MAX_ACTOR_COUNT = 6;

type CreateActorModalProps = {
  projectName: string;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (names: string[]) => void;
};

export default function CreateActorModal({
  projectName,
  isSubmitting,
  errorMessage,
  onSubmit,
}: CreateActorModalProps) {
  const [actorName, setActorName] = useState('');
  const [actorNames, setActorNames] = useState<string[]>([]);
  const [limitMessage, setLimitMessage] = useState('');
  const hasReachedActorLimit = actorNames.length >= MAX_ACTOR_COUNT;

  const getNextActorNames = () => {
    const nextName = actorName.trim();

    if (actorNames.length >= MAX_ACTOR_COUNT) {
      return actorNames;
    }

    return nextName && !actorNames.some((name) => name === nextName)
      ? [...actorNames, nextName]
      : actorNames;
  };

  const addActorName = () => {
    const nextName = actorName.trim();

    if (!nextName || isSubmitting || actorNames.includes(nextName)) {
      return;
    }

    if (hasReachedActorLimit) {
      setLimitMessage('배우는 최대 6명까지 등록할 수 있습니다.');
      return;
    }

    setActorNames((names) => [...names, nextName]);
    setActorName('');
    setLimitMessage('');
  };

  const removeActorName = (targetName: string) => {
    if (isSubmitting) {
      return;
    }

    setActorNames((names) => names.filter((name) => name !== targetName));
    setLimitMessage('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addActorName();
  };

  const handleRegisterClick = () => {
    const nextActorNames = getNextActorNames();

    if (nextActorNames.length === 0 || isSubmitting) {
      return;
    }

    if (nextActorNames.length > MAX_ACTOR_COUNT) {
      setLimitMessage('배우는 최대 6명까지 등록할 수 있습니다.');
      return;
    }

    onSubmit(nextActorNames);
  };

  return (
    <div className="reaction-ui-font fixed inset-0 z-50 flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-sm rounded-2xl border border-white/35 bg-[#efe6de]/92 p-6 text-center text-[#431B1B] shadow-[0_28px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl"
      >
        <h2 className="text-lg font-bold">배우 등록</h2>
        <p className="mt-2 text-sm font-semibold text-[#806b61]">
          {projectName}에 사용할 배우 이름을 입력해 주세요.
        </p>

        <div className="mt-5 flex gap-2">
          <label className="sr-only" htmlFor="actor-name">
            Actor name
          </label>
          <input
            id="actor-name"
            value={actorName}
            onChange={(event) => {
              setActorName(event.target.value);
              setLimitMessage('');
            }}
            disabled={isSubmitting || hasReachedActorLimit}
            autoFocus
            className="h-11 min-w-0 flex-1 rounded-full border border-[#c8b7aa] bg-white/30 px-5 text-center text-sm font-bold text-[#431B1B] outline-none transition placeholder:text-[#806b61]/60 focus:border-[#431B1B] focus:bg-white/45 focus:ring-2 focus:ring-[#431B1B]/15"
            placeholder={
              hasReachedActorLimit ? '최대 6명까지 등록 가능' : '배우 이름'
            }
            maxLength={20}
          />
          <button
            type="submit"
            disabled={!actorName.trim() || isSubmitting || hasReachedActorLimit}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#c8b7aa] bg-white/30 text-[#431B1B] transition hover:border-[#431B1B] hover:bg-white/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/20 disabled:opacity-45"
            aria-label="배우 추가"
          >
            <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {actorNames.length > 0 && (
          <div className="mt-4 flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-white/45 bg-white/20 p-3">
            {actorNames.map((name) => (
              <span
                key={name}
                className="flex min-h-8 items-center gap-1.5 rounded-full border border-white/50 bg-white/32 px-3 text-xs font-bold text-[#431B1B]"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeActorName(name)}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[#806b61] transition hover:bg-[#431B1B]/10 hover:text-[#431B1B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#431B1B]/20"
                  aria-label={`${name} 삭제`}
                >
                  <X size={13} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}

        {(limitMessage || errorMessage) && (
          <p className="mt-3 text-xs font-bold text-[#A94444]">
            {limitMessage || errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={handleRegisterClick}
          disabled={
            (!actorName.trim() && actorNames.length === 0) || isSubmitting
          }
          className="reaction-glass-pill reaction-rehearsal-start-button relative mt-6 h-10 w-full overflow-hidden rounded-full px-6 text-sm font-bold text-[#fff8ef] transition duration-300 hover:scale-[1.015] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:scale-100 disabled:opacity-55"
        >
          <span className="relative z-10">
            {isSubmitting ? '등록 중...' : '등록하고 이동'}
          </span>
        </button>
      </form>
    </div>
  );
}
