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
  const sessionPath = `/project/${projectId}/workspace/${session.id}/feedback`;
  const statusLabel =
    session.status === 'inProgress' ? '피드백 작성으로 이동' : '피드백 세션 보기';

  return (
    <Link
      to={sessionPath}
      className="group flex w-full max-w-[236px] flex-col items-center rounded-lg outline-none transition duration-500 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#eee7dc]/70"
      aria-label={`${session.title} ${statusLabel}`}
    >
      <article className="flex w-full flex-col items-center">
        <div className="reaction-project-card relative flex aspect-[236/114] w-full items-center justify-center overflow-hidden text-[#17100f] transition duration-500 group-hover:scale-[1.03] group-hover:drop-shadow-[0_18px_24px_rgba(0,0,0,0.36)]">
          <img
            src={projectCardIcon}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain transition duration-500 group-hover:brightness-110"
          />
          <span className="absolute inset-x-5 inset-y-3 translate-y-full rounded-[28px] bg-[#eee7dc]/20 transition duration-500 group-hover:translate-y-0" />
          <span className="absolute inset-x-4 inset-y-2 rounded-[30px] opacity-0 shadow-[0_0_42px_rgba(238,231,220,0.34)] transition duration-500 group-hover:opacity-100" />
          <h3 className="relative z-10 max-w-[68%] text-center text-[15px] font-semibold leading-tight transition duration-500 group-hover:text-[#4b201b]">
            {session.title}
          </h3>
        </div>

        <time className="mt-2 text-[10px] font-medium text-[#b4aca4] transition duration-500 group-hover:text-[#eee7dc]">
          {session.date}
        </time>
      </article>
    </Link>
  );
}
