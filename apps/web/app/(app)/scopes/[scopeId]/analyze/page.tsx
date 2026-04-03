'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Message = {
  role: 'analyst' | 'user';
  content: string;
};

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

type AcceptanceCriterion = { description: string; measurableCondition?: string };
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
type WorkPlan = {
  type: 'work_plan';
  summary: string;
  workstreams: Workstream[];
  estimatedTotalHours: number;
  suggestedTimelineDays: number;
  roles: { title: string; description: string; isRequired: boolean }[];
};

type AnalysisResult = SufficiencyAssessment | WorkPlan;

/* ── JSON extraction ── */

function extractAnalysisResults(content: string): AnalysisResult[] {
  try {
    const parsed = JSON.parse(content.trim());
    if (parsed.type === 'sufficiency_assessment' || parsed.type === 'work_plan') {
      return [parsed as AnalysisResult];
    }
  } catch { /* try brace matching */ }

  const results: AnalysisResult[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (content[i] === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          const p = JSON.parse(content.slice(start, i + 1));
          if (p.type === 'sufficiency_assessment' || p.type === 'work_plan') results.push(p);
        } catch { /* skip */ }
        start = -1;
      }
    }
  }
  return results;
}

/* ── Components ── */

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? 'bg-success' : score >= 60 ? 'bg-accent-client' : 'bg-error';
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

function SufficiencyAssessmentView({ data }: { data: SufficiencyAssessment }) {
  const allQuestions = data.dimensions.flatMap((d) => d.questions || []);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Sufficiency Assessment</h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${data.isReady ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
          Overall: {data.overallScore}/100
        </span>
      </div>
      <div className="space-y-3">
        {data.dimensions.map((dim, i) => (
          <div key={i} className="p-3 bg-bg-primary rounded-lg border border-border">
            <ScoreBar score={dim.score} label={dim.dimension} />
            <p className="text-xs text-text-secondary mt-2">{dim.feedback}</p>
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
      {allQuestions.length > 0 && !data.isReady && (
        <p className="text-xs text-warning font-medium">
          Answer the questions above or click "Auto-improve" to let the AI fill the gaps.
        </p>
      )}
    </div>
  );
}

function WorkPlanView({ data }: { data: WorkPlan }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-success">Work Plan Generated</h3>
        <div className="flex gap-3 text-xs text-text-secondary">
          <span>{data.estimatedTotalHours}h est.</span>
          <span>{data.suggestedTimelineDays} days</span>
        </div>
      </div>
      <p className="text-sm text-text-secondary">{data.summary}</p>
      {data.roles?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.roles.map((r, i) => (
            <span key={i} className="text-[10px] px-2 py-1 rounded bg-accent-squad/10 text-accent-squad font-medium">
              {r.title}
            </span>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {data.workstreams.map((ws, wi) => (
          <div key={wi} className="border border-border rounded-lg overflow-hidden">
            <div className="bg-accent-agent/5 px-4 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-accent-agent/10 text-accent-agent text-[10px] font-bold flex items-center justify-center">{wi + 1}</span>
                <h4 className="font-medium text-sm">{ws.title}</h4>
              </div>
              {ws.description && <p className="text-xs text-text-secondary mt-1 ml-7">{ws.description}</p>}
            </div>
            <div className="divide-y divide-border">
              {ws.deliverables.map((del, di) => (
                <div key={di} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium">{del.title}</span>
                      <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-accent-agent/10 text-accent-agent">{del.format}</span>
                      {del.suggestedRole && <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary">{del.suggestedRole}</span>}
                    </div>
                    <span className="text-xs text-text-secondary whitespace-nowrap">{del.estimatedEffortHours}h</span>
                  </div>
                  {del.description && <p className="text-xs text-text-secondary mt-1">{del.description}</p>}
                  {del.acceptanceCriteria?.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {del.acceptanceCriteria.map((ac, ai) => (
                        <li key={ai} className="text-xs text-text-secondary flex gap-1">
                          <span className="text-success shrink-0">&#10003;</span>
                          {ac.description}
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
    </div>
  );
}

function AnalystMessage({ content }: { content: string }) {
  const results = extractAnalysisResults(content);
  if (results.length === 0) return <span className="whitespace-pre-wrap">{content}</span>;
  return (
    <div className="space-y-6">
      {results.map((r, i) =>
        r.type === 'sufficiency_assessment' ? <SufficiencyAssessmentView key={i} data={r} /> :
        r.type === 'work_plan' ? <WorkPlanView key={i} data={r} /> : null
      )}
    </div>
  );
}

/* ── Main page ── */

export default function AIAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const scopeId = params.scopeId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'analyzing' | 'questions' | 'ready' | 'idle'>('idle');
  const [publishing, setPublishing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isStreaming, scrollToBottom]);

  const runAnalysis = useCallback(async (conversationMessages: Message[]) => {
    setIsStreaming(true);
    setStreamingProgress(0);
    setStatus('analyzing');

    try {
      const response = await fetch(`/api/scope-proposals/${scopeId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationMessages }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Analysis request failed');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let chunks = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text_delta') {
              accumulated += data.text;
              chunks++;
              setStreamingProgress(chunks);
            } else if (data.type === 'done') {
              const content = data.text || accumulated;
              setMessages((prev) => [...prev, { role: 'analyst', content }]);

              const results = extractAnalysisResults(content);
              const last = results[results.length - 1];
              if (last?.type === 'work_plan') setStatus('ready');
              else if (last?.type === 'sufficiency_assessment' && last.isReady) setStatus('ready');
              else setStatus('questions');
            } else if (data.type === 'error') {
              setMessages((prev) => [...prev, { role: 'analyst', content: `Error: ${data.message}` }]);
              setStatus('idle');
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'analyst', content: `Error: ${err instanceof Error ? err.message : 'Analysis failed'}` },
      ]);
      setStatus('idle');
    } finally {
      setIsStreaming(false);
      setStreamingProgress(0);
    }
  }, [scopeId]);

  // Auto-start on mount
  useEffect(() => { runAnalysis([]); }, [runAnalysis]);

  function handleSend(text?: string) {
    const content = text || input.trim();
    if (!content || isStreaming) return;

    const userMessage: Message = { role: 'user', content };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');
    runAnalysis(updated);
  }

  function handleAutoImprove() {
    handleSend('Based on your analysis, please auto-improve this scope by filling in the gaps you identified. Make reasonable assumptions where needed, then generate a complete Work Plan.');
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
      setMessages((prev) => [...prev, { role: 'analyst', content: `Publish error: ${err instanceof Error ? err.message : 'Failed'}` }]);
    } finally {
      setPublishing(false);
    }
  }

  const lastResults = messages.filter((m) => m.role === 'analyst').map((m) => extractAnalysisResults(m.content)).flat();
  const lastResult = lastResults[lastResults.length - 1];
  const showPublish = status === 'ready' && lastResult?.type === 'work_plan';
  const showAutoImprove = status === 'questions' && !isStreaming;

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold">AI Analysis</h1>
        <p className="text-text-secondary mt-1">AI-powered analysis and breakdown of your scope.</p>
      </div>

      {/* Chat area */}
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

        {/* Streaming indicator — NO raw text, just a progress indicator */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-3 text-sm bg-bg-secondary border-l-4 border-accent-agent text-text-secondary">
              <div className="flex items-center gap-3">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-agent animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-agent animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-agent animate-bounce [animation-delay:0.3s]" />
                </span>
                <span className="text-xs">
                  {streamingProgress > 0 ? `Analyzing... (${streamingProgress} chunks received)` : 'Starting analysis...'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Actions */}
      <div className="shrink-0 pt-4 space-y-3">
        {/* Auto-improve button */}
        {showAutoImprove && (
          <button
            onClick={handleAutoImprove}
            className="w-full py-2.5 px-4 bg-accent-agent text-white rounded-lg text-sm font-medium
                       hover:opacity-90 transition-opacity"
          >
            Auto-improve scope and generate Work Plan
          </button>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={isStreaming ? 'Waiting for analysis...' : 'Type a follow-up message...'}
            disabled={isStreaming}
            className="flex-1 px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary
                       focus:outline-none focus:ring-2 focus:ring-accent-squad/50
                       text-sm placeholder:text-text-secondary/50 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={isStreaming || !input.trim()}
            className="px-4 py-2.5 bg-accent-squad text-white rounded-lg text-sm font-medium
                       hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>

        {/* Publish */}
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
