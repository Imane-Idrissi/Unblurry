import type { SessionSummary } from '../../shared/types';

interface ReportQuotaExhaustedScreenProps {
  summary: SessionSummary;
  onRetry: () => void;
  onDashboard: () => void;
}

export default function ReportQuotaExhaustedScreen({
  summary,
  onRetry,
  onDashboard,
}: ReportQuotaExhaustedScreenProps) {
  const formatDuration = (minutes: number) => {
    if (minutes < 1) return '<1 min';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-md">
      <div className="w-full max-w-[520px] text-center">
        <div className="mx-auto mb-lg flex h-16 w-16 items-center justify-center rounded-full bg-caution-bg">
          <svg
            className="h-8 w-8 text-caution"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>

        <h1 className="font-heading text-h1 font-bold leading-[1.3] text-text-primary mb-sm">
          Your report is waiting
        </h1>
        <p className="text-body leading-[1.6] text-text-secondary mb-xl">
          Your session data is safely saved. Your API quota ran out — you can generate the report now or come back later from the dashboard.
        </p>

        <div className="rounded-lg border border-border bg-bg-elevated px-lg py-lg shadow-sm mb-xl">
          <div className="grid grid-cols-3 gap-md">
            <div>
              <p className="text-small font-medium text-text-tertiary mb-xs">Total</p>
              <p className="font-heading text-h3 font-semibold text-text-primary">
                {formatDuration(summary.total_minutes)}
              </p>
            </div>
            <div>
              <p className="text-small font-medium text-text-tertiary mb-xs">Active</p>
              <p className="font-heading text-h3 font-semibold text-text-primary">
                {formatDuration(summary.active_minutes)}
              </p>
            </div>
            <div>
              <p className="text-small font-medium text-text-tertiary mb-xs">Paused</p>
              <p className="font-heading text-h3 font-semibold text-text-primary">
                {formatDuration(summary.paused_minutes)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-sm">
          <button
            onClick={onDashboard}
            className="flex-1 rounded-md border border-border bg-bg-elevated px-lg py-[12px] text-body font-medium text-text-primary shadow-sm transition-colors duration-[150ms] ease-out hover:bg-bg-secondary"
          >
            Go to Dashboard
          </button>
          <button
            onClick={onRetry}
            className="flex-1 rounded-md bg-primary-500 px-lg py-[14px] text-body font-medium text-text-inverse shadow-md transition-all duration-[150ms] ease-out hover:bg-primary-600 hover:shadow-lg active:bg-primary-700"
          >
            Retry Now
          </button>
        </div>
      </div>
    </div>
  );
}
