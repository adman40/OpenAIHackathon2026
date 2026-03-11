"use client";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  suggestedActions?: string[];
  isPending?: boolean;
  onSuggestedActionClick?: (action: string) => void;
}

export default function MessageBubble({
  role,
  content,
  suggestedActions = [],
  isPending = false,
  onSuggestedActionClick,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[92%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm",
          isUser
            ? "bg-orange-700 text-white"
            : "border border-stone-200 bg-stone-50 text-stone-800",
        ].join(" ")}
      >
        <p className="whitespace-pre-wrap">{content}</p>

        {isPending ? (
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
            Thinking
          </p>
        ) : null}

        {!isUser && suggestedActions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestedActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onSuggestedActionClick?.(action)}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700 transition hover:bg-orange-50 hover:text-orange-700"
              >
                {action}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
