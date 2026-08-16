import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Minus, Send } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import {
  EmptyConversation,
  ErrorState,
  MessageBubble,
  PromptChips,
  TypingIndicator,
} from "./AssistantParts";
import { getConversation, setConversation } from "./conversation-store";
import type { AssistantConfig, AssistantMessage, AssistantSend } from "./types";

export type AssistantPanelProps = {
  config: AssistantConfig;
  onClose: () => void;
  onSend: AssistantSend;
  initialMessages?: AssistantMessage[];
  id?: string;
};

type FailedAttempt = {
  message: string;
  history: AssistantMessage[];
};

let messageId = 0;

function nextMessageId(): string {
  messageId += 1;
  return `assistant-message-${messageId}`;
}

export function AssistantPanel({
  config,
  onClose,
  onSend,
  initialMessages = [],
  id,
}: AssistantPanelProps) {
  const reactId = useId();
  const headingId = `${reactId}-heading`;
  const [messages, setMessages] = useState<AssistantMessage[]>(() =>
    getConversation(config.id, initialMessages),
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempt, setFailedAttempt] = useState<FailedAttempt | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const Icon = config.icon;

  useEffect(() => {
    setConversation(config.id, messages);
  }, [config.id, messages]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, loading, error]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function run(message: string, history: AssistantMessage[]) {
    setLoading(true);
    setError(null);

    try {
      const response = await onSend(message, history);
      const assistantMessage: AssistantMessage = {
        id: nextMessageId(),
        role: "assistant",
        content: response.answer,
        sources: response.sources,
      };
      setConversation(config.id, [
        ...getConversation(config.id, []),
        assistantMessage,
      ]);
      setMessages((current) => [...current, assistantMessage]);
      setFailedAttempt(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong. Please try again.",
      );
      setFailedAttempt({ message, history });
    } finally {
      setLoading(false);
    }
  }

  function submit(rawMessage: string) {
    const value = rawMessage.trim();
    if (!value || loading) return;

    const history = messages;
    const userMessage: AssistantMessage = {
      id: nextMessageId(),
      role: "user",
      content: value,
    };
    const nextMessages = [...messages, userMessage];
    setConversation(config.id, nextMessages);
    setMessages(nextMessages);
    setInput("");
    void run(value, history);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit(input);
    }
  }

  return (
    <div
      id={id}
      role="dialog"
      aria-labelledby={headingId}
      aria-modal="false"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="fixed inset-x-3 bottom-20 top-16 z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl sm:left-auto sm:right-5 sm:top-auto sm:h-[min(600px,calc(100dvh-9rem))] sm:w-[380px]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent">
            <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 id={headingId} className="truncate text-sm font-semibold">
                {config.name}
              </h2>
              <Badge className="shrink-0 text-[10px] tracking-wider">
                {config.badge}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {config.subtitle}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onClose}
          aria-label={`Minimize ${config.name}`}
        >
          <Minus aria-hidden="true" className="h-4 w-4" />
        </Button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && !loading ? (
          <EmptyConversation
            config={config}
            onSelectPrompt={submit}
            disabled={loading}
          />
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        {loading && <TypingIndicator />}
        {error && failedAttempt && (
          <ErrorState
            message={error}
            onRetry={() =>
              void run(failedAttempt.message, failedAttempt.history)
            }
          />
        )}
      </div>

      {messages.length > 0 && (
        <div className="px-4 pb-2">
          <PromptChips
            prompts={config.suggestedPrompts}
            onSelect={submit}
            disabled={loading}
          />
        </div>
      )}

      <form
        aria-label={`${config.name} message form`}
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={handleSubmit}
      >
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${config.name}…`}
          rows={1}
          className="max-h-32 min-h-[42px] resize-none"
          aria-label={`Message ${config.name}`}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || loading}
          className="h-[42px] w-[42px] shrink-0"
          aria-label="Send message"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
