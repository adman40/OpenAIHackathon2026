"use client";

import { useState, type KeyboardEvent } from "react";

interface ChatInputProps {
  disabled?: boolean;
  onSend: (message: string) => Promise<void> | void;
  quickPrompts?: string[];
}

export default function ChatInput({
  disabled = false,
  onSend,
  quickPrompts = [],
}: ChatInputProps) {
  const [value, setValue] = useState("");

  const submit = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || disabled) {
      return;
    }

    setValue("");
    await onSend(trimmed);
  };

  const onKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await submit(value);
    }
  };

  return (
    <div className="border-t border-stone-200 bg-white px-4 py-4">
      {quickPrompts.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void submit(prompt)}
              disabled={disabled}
              className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700 transition hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex gap-3">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => void onKeyDown(event)}
          disabled={disabled}
          rows={3}
          placeholder="Ask about study help, campus support, sports snapshot, or an outreach draft..."
          className="min-h-[92px] flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void submit(value)}
          disabled={disabled || value.trim().length === 0}
          className="self-end rounded-2xl bg-orange-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          Send
        </button>
      </div>
    </div>
  );
}
