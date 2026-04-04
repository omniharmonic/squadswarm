'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Message = { role: 'analyst' | 'user'; content: string };

/* ── JSON types ── */

type SufficiencyDimension = { dimension: string; score: number; feedback: string; questions?: string[] };
type SufficiencyAssessment = { type: 'sufficiency_assessment'; dimensions: SufficiencyDimension[]; overallScore: number; isReady: boolean };
type AcceptanceCriterion = { description: string; measurableCondition?: string };
type Deliverable = { title: string; description: string; format: string; acceptanceCriteria: AcceptanceCriterion[]; estimatedEffortHours: number; requiredSkills: string[]; suggestedRole: string };
type Workstream = { title: string; description: string; orderIndex: number; dependencies: string[]; deliverables: Deliverable[] };
type WorkPlan = { type: 'work_plan'; summary: string; workstreams: Workstream[]; estimatedTotalHours: number; suggestedTimelineDays: number; roles: { title: string; description: string; isRequired: boolean }[] };
type AnalysisResult = SufficiencyAssessment | WorkPlan;

/* ── Parse content that may contain markdown + JSON blocks ── */

type ContentSegment = { kind: 'text'; text: string } | { kind: 'result'; data: AnalysisResult };

function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];

  // Split on ```json ... ``` fences
  const parts = content.split(/(```json[\s\S]*?```)/g);

  for (const part of parts) {
    const fenceMatch = part.match(/^```json\s*([\s\S]*?)```$/);
    if (fenceMatch?.[1]) {
      try {
        const parsed = JSON.parse(fenceMatch[1].trim());
        if (parsed.type === 'sufficiency_assessment' || parsed.type === 'work_plan') {
          segments.push({ kind: 'result', data: parsed });
          continue;
        }
      } catch { /* fall through to text */ }
    }

    // Also try parsing the whole part as bare JSON (no fences)
    const trimmed = part.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type === 'sufficiency_assessment' || parsed.type === 'work_plan') {
          segments.push({ kind: 'result', data: parsed });
          continue;
        }
      } catch { /* fall through */ }
    }

    if (part.trim()) {
      segments.push({ kind: 'text', text: part });
    }
  }

  return segments;
}

function hasWorkPlan(content: string): boolean {
  return parseContent(content).some((s) => s.kind === 'result' && s.data.type === 'work_plan');
}

/* ── UI Components ── */

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? 'bg-success' : score >= 60 ? 'bg-accent-client' : 'bg-error';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-text-secondary">{score}/100</span>
      </div>
      <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function SufficiencyView({ data }: { data: SufficiencyAssessment }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Sufficiency Assessment</h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${data.isReady ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
          {data.overallScore}/100
        </span>
      </div>
      {data.dimensions.map((dim, i) => (
        <div key={i} className="p-3 bg-bg-primary rounded-lg border border-border">
          <ScoreBar score={dim.score} label={dim.dimension} />
          <p className="text-xs text-text-secondary mt-1.5">{dim.feedback}</p>
          {dim.questions && dim.questions.length > 0 && (
            <ul className="mt-2 space-y-1">
              {dim.questions.map((q, qi) => (
                <li key={qi} className="text-xs text-accent-squad flex gap-1.5">
                  <span className="shrink-0">?</span> {q}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function WorkPlanView({ data }: { data: WorkPlan }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-sm text-success">Work Plan Generated</h3>
        <div className="flex gap-3 text-xs text-text-secondary">
          <span>{data.estimatedTotalHours}h est.</span>
          <span>{data.suggestedTimelineDays} days</span>
        </div>
      </div>
      <p className="text-xs text-text-secondary">{data.summary}</p>
      {data.roles?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.roles.map((r, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-accent-squad/10 text-accent-squad font-medium">{r.title}</span>
          ))}
        </div>
      )}
      {data.workstreams.map((ws, wi) => (
        <div key={wi} className="border border-border rounded-lg overflow-hidden">
          <div className="bg-accent-agent/5 px-3 py-2 border-b border-border flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-accent-agent/10 text-accent-agent text-[10px] font-bold flex items-center justify-center">{wi + 1}</span>
            <h4 className="font-medium text-sm">{ws.title}</h4>
          </div>
          <div className="divide-y divide-border">
            {ws.deliverables.map((del, di) => (
              <div key={di} className="px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-medium">{del.title}</span>
                    <span className="text-[10px] ml-1.5 px-1 py-0.5 rounded bg-accent-agent/10 text-accent-agent">{del.format}</span>
                    {del.suggestedRole && <span className="text-[10px] ml-1 px-1 py-0.5 rounded bg-bg-secondary text-text-secondary">{del.suggestedRole}</span>}
                  </div>
                  <span className="text-xs text-text-secondary">{del.estimatedEffortHours}h</span>
                </div>
                {del.acceptanceCriteria?.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {del.acceptanceCriteria.map((ac, ai) => (
                      <li key={ai} className="text-xs text-text-secondary flex gap-1">
                        <span className="text-success shrink-0">&#10003;</span>{ac.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Simple markdown renderer ── */

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
          {listItems.map((item, i) => <li key={i} className="text-sm text-text-secondary">{renderInline(item)}</li>)}
        </ul>
      );
      listItems = [];
    }
  }

  function renderInline(s: string): React.ReactNode {
    // Bold: **text**
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<h4 key={i} className="font-semibold text-sm mt-3 mb-1">{trimmed.slice(4)}</h4>);
    } else if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<h3 key={i} className="font-semibold text-base mt-3 mb-1">{trimmed.slice(3)}</h3>);
    } else if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(<h2 key={i} className="font-bold text-lg mt-3 mb-1">{trimmed.slice(2)}</h2>);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s/, ''));
    } else if (trimmed === '') {
      flushList();
      // Skip empty lines
    } else {
      flushList();
      elements.push(<p key={i} className="text-sm text-text-secondary leading-relaxed">{renderInline(trimmed)}</p>);
    }
  }
  flushList();

  return <div className="space-y-1">{elements}</div>;
}

/* ── Render a single analyst message with mixed text + structured data ── */

function AnalystMessage({ content }: { content: string }) {
  const segments = parseContent(content);

  if (segments.length === 0) return <SimpleMarkdown text={content} />;

  return (
    <div className="space-y-4">
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          return <SimpleMarkdown key={i} text={seg.text} />;
        }
        if (seg.data.type === 'sufficiency_assessment') return <SufficiencyView key={i} data={seg.data} />;
        if (seg.data.type === 'work_plan') return <WorkPlanView key={i} data={seg.data} />;
        return null;
      })}
    </div>
  );
}

/* ── Main Page ── */

export default function AIAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const scopeId = params.scopeId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamChunks, setStreamChunks] = useState(0);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'analyzing' | 'questions' | 'ready' | 'idle'>('idle');
  const [publishing, setPublishing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, isStreaming, scrollToBottom]);

  const runAnalysis = useCallback(async (allMessages: Message[]) => {
    setIsStreaming(true);
    setStreamChunks(0);
    setStatus('analyzing');

    try {
      const res = await fetch(`/api/scope-proposals/${scopeId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let chunks = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text_delta') {
              accumulated += data.text;
              chunks++;
              setStreamChunks(chunks);
            } else if (data.type === 'done') {
              const content = data.text || accumulated;
              setMessages((prev) => [...prev, { role: 'analyst', content }]);
              if (data.status === 'ready' || hasWorkPlan(content)) setStatus('ready');
              else setStatus('questions');
            } else if (data.type === 'error') {
              setMessages((prev) => [...prev, { role: 'analyst', content: `Error: ${data.message}` }]);
              setStatus('idle');
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'analyst', content: `Error: ${err instanceof Error ? err.message : 'Failed'}` }]);
      setStatus('idle');
    } finally {
      setIsStreaming(false);
    }
  }, [scopeId]);

  // Start on mount
  useEffect(() => { runAnalysis([]); }, [runAnalysis]);

  function sendMessage(text?: string) {
    const content = text || input.trim();
    if (!content || isStreaming) return;
    const userMsg: Message = { role: 'user', content };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    runAnalysis(updated);
  }

  function handleAutoImprove() {
    sendMessage('Please auto-improve this scope: fill in the gaps you identified using your best judgment, then generate a complete Work Plan.');
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
        throw new Error(data.error || 'Publish failed');
      }
      const scope = await res.json();
      toast.success('Scope published to board!');
      router.push(`/scopes/${scope.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed';
      toast.error(message);
      setMessages((prev) => [...prev, { role: 'analyst', content: `Publish error: ${message}` }]);
    } finally {
      setPublishing(false);
    }
  }

  const showPublish = status === 'ready' && !isStreaming;
  const showAutoImprove = status === 'questions' && !isStreaming;

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold">AI Analysis</h1>
        <p className="text-text-secondary mt-1">AI-powered analysis and breakdown of your scope.</p>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-border p-4 sm:p-6 space-y-4 min-h-0">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-12 text-text-secondary text-sm">Starting analysis...</div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'analyst'
                ? 'bg-bg-secondary border-l-4 border-accent-agent'
                : 'bg-accent-squad/10 border-r-4 border-accent-squad whitespace-pre-wrap'
            }`}>
              {msg.role === 'analyst' ? <AnalystMessage content={msg.content} /> : msg.content}
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-3 text-sm bg-bg-secondary border-l-4 border-accent-agent text-text-secondary">
              <div className="flex items-center gap-3">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-agent animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-agent animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-agent animate-bounce [animation-delay:0.3s]" />
                </span>
                <span className="text-xs">{streamChunks > 0 ? `Analyzing... (${streamChunks} chunks)` : 'Starting analysis...'}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Actions */}
      <div className="shrink-0 pt-4 space-y-3">
        {showAutoImprove && (
          <button onClick={handleAutoImprove}
            className="w-full py-2.5 px-4 bg-accent-agent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Auto-improve scope and generate Work Plan
          </button>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={isStreaming ? 'Waiting for analysis...' : 'Answer questions or ask for changes...'}
            disabled={isStreaming}
            className="flex-1 px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-squad/50 text-sm placeholder:text-text-secondary/50 disabled:opacity-50"
          />
          <button onClick={() => sendMessage()} disabled={isStreaming || !input.trim()}
            className="px-4 py-2.5 bg-accent-squad text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
            Send
          </button>
        </div>

        {showPublish && (
          <button onClick={handlePublish} disabled={publishing}
            className="w-full py-2.5 px-4 bg-success text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {publishing ? 'Publishing...' : 'Publish to Scope Board'}
          </button>
        )}
      </div>
    </div>
  );
}
