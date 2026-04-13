import { useEffect } from "react";

const MaintenanceModal = ({ onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-6 w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-purple-50 mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2">Under Maintenance</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          OpenStrategies is currently undergoing maintenance. We'll have it back up for you soon.
        </p>

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default MaintenanceModal;
