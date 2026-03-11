"use client";

import { useState, type KeyboardEvent } from "react";

type QuickPrompt = {
  id: string;
  title: string;
  prompt: string;
};

interface ChatInputProps {
  disabled?: boolean;
  onSend: (message: string) => Promise<void> | void;
  quickPrompts?: QuickPrompt[];
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
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => void submit(prompt.prompt)}
              disabled={disabled}
              className="min-h-[124px] rounded-[24px] border border-stone-200 bg-[linear-gradient(180deg,#fffaf5_0%,#f5f5f4_100%)] p-4 text-left transition hover:border-orange-300 hover:bg-[linear-gradient(180deg,#fff7ed_0%,#fef3c7_100%)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700">
                You can ask...
              </p>
              <p className="mt-3 text-sm font-semibold leading-6 text-stone-900">
                {prompt.title}
              </p>
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
