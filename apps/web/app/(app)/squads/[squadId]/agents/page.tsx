'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  model: string;
  connectionType: string;
  mcpEndpoint: string | null;
  capabilities: string[] | null;
  status: string;
}

const CAPABILITY_OPTIONS = [
  'code', 'research', 'writing', 'design', 'data_analysis',
  'project_management', 'testing', 'documentation', 'review',
];

const PROVIDER_OPTIONS = ['Anthropic', 'OpenAI', 'Google', 'Local', 'Other'];

const MOCK_AGENTS: Agent[] = [
  { id: 'mock-a1', name: 'CodeSwarm', description: 'Full-stack code generation and review agent', provider: 'Anthropic', model: 'Claude Sonnet', connectionType: 'mcp', mcpEndpoint: null, capabilities: ['code', 'review', 'documentation'], status: 'active' },
  { id: 'mock-a2', name: 'ResearchBot', description: 'Deep research and analysis agent', provider: 'Anthropic', model: 'Claude Opus', connectionType: 'api', mcpEndpoint: null, capabilities: ['research', 'writing', 'data_analysis'], status: 'active' },
];

export default function AgentRegistryPage() {
  const params = useParams();
  const squadId = params.squadId as string;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('Anthropic');
  const [model, setModel] = useState('');
  const [connectionType, setConnectionType] = useState('api');
  const [mcpEndpoint, setMcpEndpoint] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/squads/${squadId}/agents`)
      .then((r) => r.json())
      .then((data) => setAgents(Array.isArray(data) && data.length > 0 ? data : MOCK_AGENTS))
      .catch(() => setAgents(MOCK_AGENTS))
      .finally(() => setLoading(false));
  }, [squadId]);

  function toggleCapability(cap: string) {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap],
    );
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setApiKey(null);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, provider, model, connectionType, mcpEndpoint: connectionType === 'mcp' ? mcpEndpoint : undefined, capabilities }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.apiKey) setApiKey(data.apiKey);
        setAgents((prev) => [data.agent || data, ...prev.filter((a) => !a.id.startsWith('mock-'))]);
        setName(''); setDescription(''); setModel(''); setMcpEndpoint(''); setCapabilities([]);
      }
    } catch {}
    setSubmitting(false);
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/squads/${squadId}`} className="text-sm text-text-secondary hover:text-text-primary">&larr; Back to Squad</Link>
          </div>
          <h1 className="text-2xl font-bold">Agent Registry</h1>
          <p className="text-text-secondary mt-1">Register AI agents to your squad's swarm.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-accent-agent text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          {showForm ? 'Cancel' : 'Register Agent'}
        </button>
      </div>

      {/* API Key Alert */}
      {apiKey && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-sm text-warning mb-2">Save this API key now!</h3>
          <p className="text-xs text-text-secondary mb-2">You won't see it again. Your agent will use this key to authenticate.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white p-2 rounded border border-border font-mono break-all">{apiKey}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(apiKey); }}
              className="px-3 py-2 bg-warning text-white rounded text-xs font-medium shrink-0"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Registration Form */}
      {showForm && (
        <form onSubmit={handleRegister} className="bg-white rounded-xl border border-border p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Agent Name *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., CodeSwarm"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-agent/50 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Provider</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary text-sm">
                {PROVIDER_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Model</label>
              <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g., Claude Sonnet 4.5"
                className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-agent/50 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Connection Type</label>
              <select value={connectionType} onChange={(e) => setConnectionType(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary text-sm">
                <option value="api">API</option>
                <option value="mcp">MCP</option>
                <option value="local">Local</option>
              </select>
            </div>
          </div>

          {connectionType === 'mcp' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">MCP Endpoint</label>
              <input type="url" value={mcpEndpoint} onChange={(e) => setMcpEndpoint(e.target.value)} placeholder="https://..."
                className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-agent/50 text-sm" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this agent do?"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-agent/50 text-sm resize-y" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Capabilities</label>
            <div className="flex flex-wrap gap-2">
              {CAPABILITY_OPTIONS.map((cap) => (
                <button key={cap} type="button" onClick={() => toggleCapability(cap)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    capabilities.includes(cap) ? 'bg-accent-agent text-white' : 'bg-bg-secondary text-text-secondary hover:bg-accent-agent/10'
                  }`}>
                  {cap.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={!name.trim() || submitting}
            className="w-full py-2.5 bg-accent-agent text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {submitting ? 'Registering...' : 'Register Agent'}
          </button>
        </form>
      )}

      {/* Agent List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-accent-agent border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-accent-agent/10 rounded-lg flex items-center justify-center mx-auto mb-4 rotate-45">
            <span className="text-accent-agent text-2xl -rotate-45">AI</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">No agents registered</h3>
          <p className="text-text-secondary text-sm mb-4">Register AI agents to amplify your squad's capabilities.</p>
          <button onClick={() => setShowForm(true)} className="px-5 py-2.5 bg-accent-agent text-white rounded-lg text-sm font-medium">
            Register your first agent
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-white rounded-xl border border-border p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-accent-agent/10 rounded-lg flex items-center justify-center rotate-45 border border-accent-agent/20 shrink-0">
                <span className="text-accent-agent text-xs font-bold -rotate-45">{agent.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{agent.name}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${agent.status === 'active' ? 'bg-success/10 text-success' : 'bg-bg-secondary text-text-secondary'}`}>
                    {agent.status}
                  </span>
                </div>
                {agent.description && <p className="text-xs text-text-secondary mb-2">{agent.description}</p>}
                <div className="flex items-center gap-3 text-xs text-text-secondary mb-2">
                  <span>{agent.provider} / {agent.model}</span>
                  <span className="capitalize">{agent.connectionType}</span>
                </div>
                {agent.capabilities && agent.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.map((cap) => (
                      <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded bg-accent-agent/10 text-accent-agent">
                        {cap.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
