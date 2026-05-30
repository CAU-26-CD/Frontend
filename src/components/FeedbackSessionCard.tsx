import { Link } from 'react-router-dom';
import projectCardIcon from '../images/icon/ProjectCard.svg';
import type { FeedbackSession } from '../types/feedback';

type FeedbackSessionCardProps = {
  projectId: number;
  session: FeedbackSession;
};

export default function FeedbackSessionCard({
  projectId,
  session,
}: FeedbackSessionCardProps) {
  const isRehearsalStarted =
    session.status === 'inProgress' && session.isRehearsalStarted;
  const sessionPath =
    session.status === 'inProgress'
      ? `/project/${projectId}/workspace/${session.id}/feedback`
      : `/project/${projectId}/workspace/${session.id}/review`;
  const sessionDate = session.date.includes('T')
    ? session.date.split('T')[0]
    : session.date.split(' ')[0];
  const statusLabel = isRehearsalStarted
    ? '리허설 진행중입니다'
    : session.status === 'inProgress'
      ? '피드백 작성으로 이동'
      : '피드백 세션 보기';

  const cardContent = (
    <article className="flex w-full flex-col items-center">
      <div
        className={[
          'reaction-project-card relative flex aspect-[236/114] w-full items-center justify-center overflow-hidden text-[#17100f] transition duration-300',
          isRehearsalStarted ? '' : 'group-hover:scale-[1.04]',
        ].join(' ')}
      >
        <img
          src={projectCardIcon}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <h3 className="relative z-10 max-w-[68%] text-center text-[15px] font-semibold leading-tight">
          {session.title}
        </h3>
        {isRehearsalStarted && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#17100f]/46 px-5 text-center">
            <span className="rounded-full border border-white/35 bg-[#5f5b57]/72 px-3 py-1.5 text-[11px] font-bold text-[#eee7dc] shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm">
              리허설 진행중입니다
            </span>
          </div>
        )}
      </div>

      <time className="mt-2 text-[10px] font-medium text-[#b4aca4]">
        {sessionDate}
      </time>
    </article>
  );
  const wrapperClassName =
    'group flex w-full max-w-[236px] flex-col items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#eee7dc]/70';

  if (isRehearsalStarted) {
    return (
      <div
        className={`${wrapperClassName} cursor-not-allowed`}
        aria-disabled="true"
        aria-label={`${session.title} ${statusLabel}`}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      to={sessionPath}
      className={wrapperClassName}
      aria-label={`${session.title} ${statusLabel}`}
    >
      {cardContent}
    </Link>
  );
}
