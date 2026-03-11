"use client";

import { useMemo, useState } from "react";

import { DEMO_PROFILE, useProfile } from "../../lib/profile-context";
import type { ChatCitation, ChatResponse } from "../../lib/types";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  suggestedActions?: string[];
  isPending?: boolean;
};

interface ChatWindowProps {
  title?: string;
  subtitle?: string;
}

const QUICK_PROMPTS = [
  "You can ask where to get help with food insecurity, stress, or mental health at UT.",
  "You can ask how many times Texas has beaten Texas A&M in football.",
  "You can ask for a cold outreach email to a professor.",
];

const INITIAL_MESSAGE: Message = {
  id: "hook-chat-intro",
  role: "assistant",
  content:
    "I can help with campus resources, live UT sports questions, and cold outreach drafts. Ask one concrete question and I will turn it into a next step.",
};

export default function ChatWindow({
  title = "Hook Chat",
  subtitle = "Profile-aware assistant",
}: ChatWindowProps) {
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  const messagePayload = useMemo(
    () =>
      messages
        .filter((message) => !message.isPending)
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    [messages]
  );

  const sendMessage = async (content: string) => {
    const nextUserMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    const pendingMessage: Message = {
      id: `pending-${Date.now()}`,
      role: "assistant",
      content: "Working through your profile and local resource context...",
      isPending: true,
    };

    setMessages((current) => [...current, nextUserMessage, pendingMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messagePayload, { role: "user", content }],
          profile: profile ?? DEMO_PROFILE,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as ChatResponse;

      setMessages((current) => [
        ...current.filter((message) => !message.isPending),
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: payload.answer,
          citations: payload.citations,
          suggestedActions: payload.suggestedActions,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The chat request failed unexpectedly.";

      setMessages((current) => [
        ...current.filter((item) => !item.isPending),
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            "I hit a demo-safe fallback while generating that answer. Try a more specific question or ask again in a moment.",
          suggestedActions: ["Retry the question", "Ask for one narrower next step"],
          citations: [
            {
              label: "Hook local fallback",
              sourceType: "resource",
              note: message,
            },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-[0_18px_50px_rgba(28,25,23,0.08)]">
      <div className="border-b border-stone-200 px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
              {subtitle}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-stone-900">{title}</h3>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
            GPT-4o + local resources
          </span>
        </div>
      </div>

      <div className="flex max-h-[620px] min-h-[620px] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#fff7ed_0%,#fafaf9_100%)] px-4 py-4 md:px-5">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
              citations={message.citations}
              suggestedActions={message.suggestedActions}
              isPending={message.isPending}
              onSuggestedActionClick={isLoading ? undefined : sendMessage}
            />
          ))}
        </div>

        <ChatInput disabled={isLoading} onSend={sendMessage} quickPrompts={QUICK_PROMPTS} />
      </div>
    </section>
  );
}
