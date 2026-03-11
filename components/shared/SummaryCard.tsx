"use client";

import Link from "next/link";

interface SummaryCardProps {
  title: string;
  subtitle: string;
  metric: string;
  status: string;
  actionHref: string;
  actionLabel: string;
}

export default function SummaryCard({
  title,
  subtitle,
  metric,
  status,
  actionHref,
  actionLabel,
}: SummaryCardProps) {
  return (
    <article className="flex h-full min-h-[320px] flex-col rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_18px_50px_rgba(28,25,23,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-stone-900">{title}</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">{subtitle}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
          {status}
        </span>
      </div>

      <div className="mt-auto flex items-end justify-between gap-4 pt-8">
        <p className="text-3xl font-semibold tracking-tight text-stone-900">{metric}</p>
        <Link
          href={actionHref}
          className="text-sm font-semibold text-orange-700 transition hover:text-orange-800"
        >
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}
