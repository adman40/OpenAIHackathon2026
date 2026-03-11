interface PrereqAlertBannerProps {
  alerts: string[];
}

export function PrereqAlertBanner({ alerts }: PrereqAlertBannerProps) {
  if (alerts.length === 0) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <p className="text-sm font-medium text-emerald-800">No prereq blockers right now.</p>
        <p className="mt-1 text-sm text-emerald-700">
          Hook does not see an immediate prerequisite chain warning for this plan.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
        Prereq alerts
      </p>
      <div className="mt-3 space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert}
            className="rounded-lg border border-red-100 bg-white/70 p-3 text-sm text-red-900"
          >
            {alert}
          </div>
        ))}
      </div>
    </section>
  );
}
