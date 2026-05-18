type CardSkeletonProps = {
  count?: number;
  className?: string;
};

export default function CardSkeleton({
  count = 4,
  className = '',
}: CardSkeletonProps) {
  return (
    <div
      className={`grid grid-cols-[repeat(auto-fit,minmax(180px,236px))] gap-x-5 gap-y-6 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="w-full max-w-[236px]">
          <div className="reaction-card-skeleton reaction-project-card-skeleton aspect-[236/114] w-full" />
          <div className="reaction-card-skeleton mx-auto mt-2 h-2.5 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}
