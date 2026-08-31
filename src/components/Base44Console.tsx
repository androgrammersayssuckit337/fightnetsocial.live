import React, { useState } from 'react';
import { Zap, Server, Code, Play, Database, CheckCircle2, AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { base44 } from '../services/base44';

interface ApiLogEntry {
  id: string;
  type: 'entity_list' | 'entity_create' | 'function_invoke' | 'telemetry_log';
  target: string;
  status: 'success' | 'error' | 'pending';
  latencyMs: number;
  timestamp: string;
  requestPayload?: any;
  responsePayload?: any;
}

export function Base44Console() {
  const [activeTab, setActiveTab] = useState<'entities' | 'functions' | 'telemetry'>('entities');
  const [entityName, setEntityName] = useState('telemetryLogs');
  const [functionName, setFunctionName] = useState('getFightMetrics');
  const [customPayload, setCustomPayload] = useState('{\n  "fighterId": "fighter_123"\n}');
  const [eventName, setEventName] = useState('fighter_profile_viewed');
  
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const addLog = (entry: ApiLogEntry) => {
    setLogs(prev => [entry, ...prev.slice(0, 19)]);
  };

  const handleRunEntityList = async () => {
    if (!entityName.trim()) return;
    setIsExecuting(true);
    const start = performance.now();
    const logId = `log_${Date.now()}`;
    
    try {
      const data = await base44.entities.list(entityName.trim());
      const latency = Math.round(performance.now() - start);
      addLog({
        id: logId,
        type: 'entity_list',
        target: entityName.trim(),
        status: 'success',
        latencyMs: latency,
        timestamp: new Date().toLocaleTimeString(),
        responsePayload: data
      });
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      addLog({
        id: logId,
        type: 'entity_list',
        target: entityName.trim(),
        status: 'error',
        latencyMs: latency,
        timestamp: new Date().toLocaleTimeString(),
        responsePayload: { error: err.message || String(err) }
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunEntityCreate = async () => {
    if (!entityName.trim()) return;
    setIsExecuting(true);
    const start = performance.now();
    const logId = `log_${Date.now()}`;
    let parsed: any = {};
    try {
      parsed = JSON.parse(customPayload);
    } catch (e) {
      parsed = { note: customPayload, createdAt: new Date().toISOString() };
    }

    try {
      const res = await base44.entities.create(entityName.trim(), parsed);
      const latency = Math.round(performance.now() - start);
      addLog({
        id: logId,
        type: 'entity_create',
        target: entityName.trim(),
        status: 'success',
        latencyMs: latency,
        timestamp: new Date().toLocaleTimeString(),
        requestPayload: parsed,
        responsePayload: res
      });
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      addLog({
        id: logId,
        type: 'entity_create',
        target: entityName.trim(),
        status: 'error',
        latencyMs: latency,
        timestamp: new Date().toLocaleTimeString(),
        requestPayload: parsed,
        responsePayload: { error: err.message || String(err) }
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunFunctionInvoke = async () => {
    if (!functionName.trim()) return;
    setIsExecuting(true);
    const start = performance.now();
    const logId = `log_${Date.now()}`;
    let parsedPayload: any = {};
    try {
      parsedPayload = JSON.parse(customPayload);
    } catch (e) {
      parsedPayload = { rawInput: customPayload };
    }

    try {
      const res = await base44.functions.invoke(functionName.trim(), parsedPayload);
      const latency = Math.round(performance.now() - start);
      addLog({
        id: logId,
        type: 'function_invoke',
        target: functionName.trim(),
        status: 'success',
        latencyMs: latency,
        timestamp: new Date().toLocaleTimeString(),
        requestPayload: parsedPayload,
        responsePayload: res
      });
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      addLog({
        id: logId,
        type: 'function_invoke',
        target: functionName.trim(),
        status: 'error',
        latencyMs: latency,
        timestamp: new Date().toLocaleTimeString(),
        requestPayload: parsedPayload,
        responsePayload: { error: err.message || String(err) }
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSendTelemetry = async () => {
    if (!eventName.trim()) return;
    setIsExecuting(true);
    const start = performance.now();
    const logId = `log_${Date.now()}`;
    
    try {
      await base44.telemetry.log(eventName.trim(), 'user_console_test', { source: 'Base44Console' });
      const latency = Math.round(performance.now() - start);
      addLog({
        id: logId,
        type: 'telemetry_log',
        target: eventName.trim(),
        status: 'success',
        latencyMs: latency,
        timestamp: new Date().toLocaleTimeString(),
        requestPayload: { event: eventName.trim(), source: 'Base44Console' },
        responsePayload: { status: 'logged', sdk: '@base44/sdk' }
      });
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      addLog({
        id: logId,
        type: 'telemetry_log',
        target: eventName.trim(),
        status: 'error',
        latencyMs: latency,
        timestamp: new Date().toLocaleTimeString(),
        responsePayload: { error: err.message || String(err) }
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyLog = (id: string, content: any) => {
    navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-zinc-950 border border-indigo-500/20 rounded-2xl p-6 space-y-6 text-white shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              Base44 API Console
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                @base44/sdk v0.8.41
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Direct interaction with Base44 Cloud entities, functions, and telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Base44 Client Active
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex border-b border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab('entities')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'entities'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          Entities
        </button>
        <button
          onClick={() => setActiveTab('functions')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'functions'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Code className="w-4 h-4" />
          Functions
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'telemetry'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Server className="w-4 h-4" />
          Telemetry & Events
        </button>
      </div>

      {/* Control Panel by Tab */}
      {activeTab === 'entities' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5">
                Target Entity Name
              </label>
              <input
                type="text"
                value={entityName}
                onChange={e => setEntityName(e.target.value)}
                placeholder="e.g. telemetryLogs, fighters, bouts"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5">
                Quick Entity Selector
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['telemetryLogs', 'sponsorshipApplications', 'fighters', 'fightBouts'].map(name => (
                  <button
                    key={name}
                    onClick={() => setEntityName(name)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-mono px-2.5 py-1 rounded-lg transition"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5">
              JSON Entity Payload (for Create)
            </label>
            <textarea
              value={customPayload}
              onChange={e => setCustomPayload(e.target.value)}
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRunEntityList}
              disabled={isExecuting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              base44.entities.list("{entityName}")
            </button>
            <button
              onClick={handleRunEntityCreate}
              disabled={isExecuting}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-indigo-300 border border-indigo-500/30 font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              base44.entities.create(...)
            </button>
          </div>
        </div>
      )}

      {activeTab === 'functions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5">
                Function Name
              </label>
              <input
                type="text"
                value={functionName}
                onChange={e => setFunctionName(e.target.value)}
                placeholder="e.g. getFightMetrics, analyzeFightTape"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5">
                Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'getFightMetrics', payload: '{\n  "fighterId": "f_99"\n}' },
                  { name: 'logTelemetry', payload: '{\n  "action": "view_stats"\n}' },
                  { name: 'calcScoutingScore', payload: '{\n  "wins": 12,\n  "losses": 2\n}' }
                ].map(p => (
                  <button
                    key={p.name}
                    onClick={() => {
                      setFunctionName(p.name);
                      setCustomPayload(p.payload);
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-mono px-2 py-1 rounded-lg transition"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5">
              Function Arguments (JSON Payload)
            </label>
            <textarea
              value={customPayload}
              onChange={e => setCustomPayload(e.target.value)}
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleRunFunctionInvoke}
            disabled={isExecuting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
          >
            {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Code className="w-4 h-4" />}
            base44.functions.invoke("{functionName}", payload)
          </button>
        </div>
      )}

      {activeTab === 'telemetry' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5">
              Telemetry Event Identifier
            </label>
            <input
              type="text"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              placeholder="e.g. bout_scheduled, video_clip_uploaded"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {['fighter_profile_viewed', 'matchup_created', 'contract_signed', 'sponsorship_pitched'].map(ev => (
              <button
                key={ev}
                onClick={() => setEventName(ev)}
                className="bg-zinc-900 hover:bg-zinc-800 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono px-2.5 py-1 rounded-lg transition"
              >
                + {ev}
              </button>
            ))}
          </div>

          <button
            onClick={handleSendTelemetry}
            disabled={isExecuting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
          >
            {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
            base44.telemetry.log("{eventName}")
          </button>
        </div>
      )}

      {/* Output Console Log */}
      <div className="space-y-3 border-t border-zinc-800 pt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            Execution Log & Response Stream
            {logs.length > 0 && (
              <span className="bg-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-full">
                {logs.length} calls
              </span>
            )}
          </h4>
          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              className="text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-300 transition"
            >
              Clear Log
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-6 text-center text-zinc-500 text-xs font-mono">
            No API calls executed yet. Click above to run Base44 SDK commands.
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {logs.map(log => (
              <div
                key={log.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2 text-xs font-mono relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span className="font-bold text-white uppercase text-[10px] bg-zinc-800 px-2 py-0.5 rounded">
                      {log.type}
                    </span>
                    <span className="text-indigo-300 font-bold">{log.target}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                    <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      {log.latencyMs}ms
                    </span>
                    <span>{log.timestamp}</span>
                    <button
                      onClick={() => handleCopyLog(log.id, log.responsePayload)}
                      className="text-zinc-500 hover:text-white transition p-1"
                      title="Copy JSON Response"
                    >
                      {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {log.requestPayload && (
                  <div className="bg-black/60 p-2 rounded-lg text-[11px] text-zinc-400 overflow-x-auto">
                    <span className="text-zinc-500 font-bold">Request: </span>
                    {JSON.stringify(log.requestPayload)}
                  </div>
                )}

                <div className="bg-black/80 p-2 rounded-lg text-[11px] text-emerald-300 overflow-x-auto max-h-32">
                  <span className="text-zinc-500 font-bold">Response: </span>
                  {JSON.stringify(log.responsePayload, null, 2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
