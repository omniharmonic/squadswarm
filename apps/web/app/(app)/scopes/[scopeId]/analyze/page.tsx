'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Message = {
  role: 'analyst' | 'user';
  content: string;
};

export default function AIAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const scopeId = params.scopeId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'analyzing' | 'questions' | 'ready' | 'idle'>('idle');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  const runAnalysis = useCallback(async (conversationHistory: Message[]) => {
    setIsStreaming(true);
    setStreamingText('');
    setStatus('analyzing');

    try {
      const response = await fetch(`/api/scope-proposals/${scopeId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Analysis request failed');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'text_delta') {
                accumulated += data.text;
                setStreamingText(accumulated);
              } else if (data.type === 'done') {
                setMessages((prev) => [
                  ...prev,
                  { role: 'analyst', content: accumulated },
                ]);
                setStreamingText('');

                if (data.status === 'ready') {
                  setStatus('ready');
                } else if (data.questions) {
                  setStatus('questions');
                } else {
                  setStatus('ready');
                }
              }
            } catch {
              // Ignore malformed JSON lines
            }
          }
        }
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Analysis failed';
      setMessages((prev) => [
        ...prev,
        { role: 'analyst', content: `Error: ${errorMsg}` },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [scopeId]);

  // Start analysis on mount
  useEffect(() => {
    runAnalysis([]);
  }, [runAnalysis]);

  function handleSend() {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');
    runAnalysis(updated);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handlePublish() {
    router.push(`/scopes/${scopeId}`);
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-text-primary">AI Analysis</h1>
        <p className="text-text-secondary mt-1">
          AI-powered analysis and breakdown of your scope.
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-border p-4 sm:p-6 space-y-4 min-h-0">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-12 text-text-secondary text-sm">
            Starting analysis...
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'analyst'
                  ? 'bg-bg-secondary border-l-4 border-accent-agent text-text-primary'
                  : 'bg-accent-squad/10 border-r-4 border-accent-squad text-text-primary'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap bg-bg-secondary border-l-4 border-accent-agent text-text-primary">
              {streamingText}
              <span className="inline-block w-1.5 h-4 bg-accent-agent/60 ml-0.5 animate-pulse" />
            </div>
          </div>
        )}

        {isStreaming && !streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-3 text-sm bg-bg-secondary border-l-4 border-accent-agent text-text-secondary">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-agent/60 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent-agent/60 animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent-agent/60 animate-bounce [animation-delay:0.3s]" />
              </span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 pt-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming
                ? 'Waiting for analysis...'
                : 'Type a follow-up message...'
            }
            disabled={isStreaming}
            className="flex-1 px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary
                       focus:outline-none focus:ring-2 focus:ring-accent-squad/50 focus:border-accent-squad
                       text-sm placeholder:text-text-secondary/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="px-4 py-2.5 bg-accent-squad text-white rounded-lg text-sm font-medium
                       hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>

        {status === 'ready' && (
          <button
            onClick={handlePublish}
            className="w-full py-2.5 px-4 bg-success text-white rounded-lg text-sm font-medium
                       hover:opacity-90 transition-opacity"
          >
            Publish to Scope Board
          </button>
        )}
      </div>
    </div>
  );
}
