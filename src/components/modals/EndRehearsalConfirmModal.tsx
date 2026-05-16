type EndRehearsalConfirmModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

export default function EndRehearsalConfirmModal({
  onCancel,
  onConfirm,
}: EndRehearsalConfirmModalProps) {
  return (
    <div className="reaction-ui-font fixed inset-0 z-50 flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/35 bg-[#efe6de]/92 p-6 text-center text-[#2d1715] shadow-[0_28px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <h2 className="text-lg font-bold">리허설을 종료하시겠습니까?</h2>
        <p className="mt-2 text-sm font-semibold text-[#806b61]">
          현재까지의 작업내용을 저장하고 나갑니다.
        </p>

        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl border border-[#c8b7aa] px-5 text-sm font-bold text-[#806b61] transition hover:border-[#431B1B] hover:text-[#431B1B]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="reaction-glass-pill reaction-rehearsal-start-button relative h-10 overflow-hidden rounded-full px-6 text-sm font-bold text-[#fff8ef] transition duration-300 hover:scale-[1.025] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <span className="relative z-10">나가기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
