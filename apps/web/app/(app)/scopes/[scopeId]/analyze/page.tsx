'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Message = {
  role: 'analyst' | 'user';
  content: string;
};

/* ── AI response types ── */

type SufficiencyDimension = {
  dimension: string;
  score: number;
  feedback: string;
  questions?: string[];
};

type SufficiencyAssessment = {
  type: 'sufficiency_assessment';
  dimensions: SufficiencyDimension[];
  overallScore: number;
  isReady: boolean;
};

type AcceptanceCriterion = {
  description: string;
  measurableCondition?: string;
};

type Deliverable = {
  title: string;
  description: string;
  format: string;
  acceptanceCriteria: AcceptanceCriterion[];
  estimatedEffortHours: number;
  requiredSkills: string[];
  suggestedRole: string;
};

type Workstream = {
  title: string;
  description: string;
  orderIndex: number;
  dependencies: string[];
  deliverables: Deliverable[];
};

type WorkPlanRole = {
  title: string;
  description: string;
  isRequired: boolean;
};

type WorkPlan = {
  type: 'work_plan';
  summary: string;
  workstreams: Workstream[];
  estimatedTotalHours: number;
  suggestedTimelineDays: number;
  roles: WorkPlanRole[];
};

type AnalysisResult = SufficiencyAssessment | WorkPlan;

/* ── Helper to try parsing JSON from AI content ── */

function tryParseAnalysis(content: string): AnalysisResult | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.type === 'sufficiency_assessment' || parsed.type === 'work_plan') {
      return parsed as AnalysisResult;
    }
  } catch {
    // not valid JSON
  }
  return null;
}

/* ── Score bar component ── */

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? 'bg-success' : score >= 60 ? 'bg-accent-client' : 'bg-error';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-text-primary">{label}</span>
        <span className="text-text-secondary">{score}/100</span>
      </div>
      <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

/* ── Sufficiency Assessment renderer ── */

function SufficiencyAssessmentView({ data }: { data: SufficiencyAssessment }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-primary">Sufficiency Assessment</h3>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            data.isReady ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
          }`}
        >
          Overall: {data.overallScore}/100
        </span>
      </div>

      <div className="space-y-4">
        {data.dimensions.map((dim, i) => (
          <div key={i} className="p-4 bg-bg-primary rounded-lg border border-border">
            <ScoreBar score={dim.score} label={dim.dimension} />
            <p className="text-sm text-text-secondary mt-2">{dim.feedback}</p>
            {dim.questions && dim.questions.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-text-primary mb-1.5">Questions to address:</p>
                <ul className="list-disc list-inside space-y-1">
                  {dim.questions.map((q, qi) => (
                    <li key={qi} className="text-sm text-accent-squad">{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {!data.isReady && (
        <p className="text-sm text-warning font-medium">
          Some dimensions need improvement. Answer the questions above to refine the scope.
        </p>
      )}
    </div>
  );
}

/* ── Work Plan renderer ── */

function WorkPlanView({ data }: { data: WorkPlan }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-text-primary">Work Plan</h3>
        <div className="flex gap-3 text-xs text-text-secondary">
          <span>{data.estimatedTotalHours}h estimated</span>
          <span>{data.suggestedTimelineDays} day timeline</span>
        </div>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed">{data.summary}</p>

      {/* Roles */}
      {data.roles && data.roles.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-text-primary mb-2">Roles</h4>
          <div className="flex flex-wrap gap-2">
            {data.roles.map((role, i) => (
              <div
                key={i}
                className={`px-3 py-1.5 rounded-lg border text-xs ${
                  role.isRequired
                    ? 'border-accent-squad/30 bg-accent-squad/5 text-accent-squad'
                    : 'border-border bg-bg-secondary text-text-secondary'
                }`}
                title={role.description}
              >
                {role.title} {role.isRequired && '*'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workstreams */}
      <div className="space-y-4">
        {data.workstreams.map((ws, wi) => (
          <div key={wi} className="border border-border rounded-xl overflow-hidden">
            <div className="bg-accent-agent/5 px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent-agent/10 text-accent-agent text-xs font-semibold shrink-0">
                  {wi + 1}
                </span>
                <h4 className="font-semibold text-text-primary text-sm">{ws.title}</h4>
              </div>
              <p className="text-xs text-text-secondary mt-1 ml-8">{ws.description}</p>
              {ws.dependencies && ws.dependencies.length > 0 && (
                <p className="text-xs text-text-secondary mt-1 ml-8">
                  Depends on: {ws.dependencies.join(', ')}
                </p>
              )}
            </div>

            <div className="divide-y divide-border">
              {ws.deliverables.map((del, di) => (
                <div key={di} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-text-primary">{del.title}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-agent/10 text-accent-agent">
                          {del.format}
                        </span>
                        {del.suggestedRole && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary">
                            {del.suggestedRole}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1">{del.description}</p>
                    </div>
                    <span className="text-xs font-semibold text-text-secondary whitespace-nowrap">
                      {del.estimatedEffortHours}h
                    </span>
                  </div>

                  {del.acceptanceCriteria && del.acceptanceCriteria.length > 0 && (
                    <div className="mt-2 ml-0">
                      <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                        Acceptance Criteria
                      </p>
                      <ul className="space-y-0.5">
                        {del.acceptanceCriteria.map((ac, ai) => (
                          <li key={ai} className="text-xs text-text-secondary flex gap-1.5">
                            <span className="text-success shrink-0">&#10003;</span>
                            <span>{ac.description}{ac.measurableCondition ? ` (${ac.measurableCondition})` : ''}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {del.requiredSkills && del.requiredSkills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {del.requiredSkills.map((skill, si) => (
                        <span key={si} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Formatted analysis message ── */

function AnalystMessage({ content }: { content: string }) {
  const parsed = tryParseAnalysis(content);

  if (!parsed) {
    // Not JSON — render as plain text
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  if (parsed.type === 'sufficiency_assessment') {
    return <SufficiencyAssessmentView data={parsed} />;
  }

  if (parsed.type === 'work_plan') {
    return <WorkPlanView data={parsed} />;
  }

  return <span className="whitespace-pre-wrap">{content}</span>;
}

/* ── Main page ── */

export default function AIAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const scopeId = params.scopeId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'analyzing' | 'questions' | 'ready' | 'idle'>('idle');
  const [publishing, setPublishing] = useState(false);
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

                // Determine status from the content
                const parsed = tryParseAnalysis(accumulated);
                if (parsed?.type === 'work_plan') {
                  setStatus('ready');
                } else if (parsed?.type === 'sufficiency_assessment') {
                  setStatus(parsed.isReady ? 'ready' : 'questions');
                } else {
                  setStatus('questions');
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

  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/scope-proposals/${scopeId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to publish');
      }

      const scope = await res.json();
      router.push(`/scopes/${scope.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Publish failed';
      setMessages((prev) => [...prev, { role: 'analyst', content: `Publish error: ${msg}` }]);
    } finally {
      setPublishing(false);
    }
  }

  // Check if the latest analyst message is a work_plan (to show Publish button)
  const lastAnalystMsg = [...messages].reverse().find((m) => m.role === 'analyst');
  const lastParsed = lastAnalystMsg ? tryParseAnalysis(lastAnalystMsg.content) : null;
  const showPublish = status === 'ready' && lastParsed?.type === 'work_plan';

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
              className={`max-w-[90%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'analyst'
                  ? 'bg-bg-secondary border-l-4 border-accent-agent text-text-primary'
                  : 'bg-accent-squad/10 border-r-4 border-accent-squad text-text-primary whitespace-pre-wrap'
              }`}
            >
              {msg.role === 'analyst' ? (
                <AnalystMessage content={msg.content} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap bg-bg-secondary border-l-4 border-accent-agent text-text-primary opacity-60">
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

        {showPublish && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="w-full py-2.5 px-4 bg-success text-white rounded-lg text-sm font-medium
                       hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {publishing ? 'Publishing...' : 'Publish to Scope Board'}
          </button>
        )}
      </div>
    </div>
  );
}
