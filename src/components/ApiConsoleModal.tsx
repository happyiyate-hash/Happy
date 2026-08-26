import React, { useState } from 'react';
import {
  X,
  Play,
  Copy,
  Check,
  Code2,
  Terminal,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Database,
  Server,
  Cloud,
} from 'lucide-react';
import { executeWorkerGenericAction } from '../services/workerApi';

interface ApiConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VERCEL_TEMPLATES: Record<string, { label: string; endpoint: string; method: 'GET' | 'POST'; description: string; json: object }> = {
  vercel_health: {
    label: 'GET /api/health',
    endpoint: '/api/health',
    method: 'GET',
    description: 'Check Vercel API service health status',
    json: {},
  },
  vercel_info: {
    label: 'GET /api',
    endpoint: '/api',
    method: 'GET',
    description: 'List available Vercel API routes',
    json: {},
  },
  vercel_token_details: {
    label: 'POST /api/token/details',
    endpoint: '/api/token/details',
    method: 'POST',
    description: 'Fetch normalized token details from multi-provider pipeline',
    json: {
      chain: 'ethereum',
      contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    },
  },
  vercel_token_price: {
    label: 'POST /api/token/price',
    endpoint: '/api/token/price',
    method: 'POST',
    description: 'Fetch real-time price & 24h change for single token',
    json: {
      chain: 'ethereum',
      contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    },
  },
  vercel_tokens_prices: {
    label: 'POST /api/tokens/prices (Batch)',
    endpoint: '/api/tokens/prices',
    method: 'POST',
    description: 'Batch query prices across multiple chains in 1 HTTP call',
    json: {
      tokens: [
        {
          chain: 'ethereum',
          contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
        },
        {
          chain: 'polygon',
          contractAddress: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
        },
        {
          chain: 'base',
          contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        },
      ],
    },
  },
  vercel_token_chart: {
    label: 'POST /api/token/chart',
    endpoint: '/api/token/chart',
    method: 'POST',
    description: 'Fetch normalized time-series chart price points',
    json: {
      chain: 'ethereum',
      contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
      interval: '1h',
      limit: 100,
    },
  },
};

const WORKER_TEMPLATES: Record<string, { label: string; description: string; json: object }> = {
  getTokenDetails: {
    label: 'getTokenDetails',
    description: 'Worker action: Fetch normalized token details by address',
    json: {
      action: 'getTokenDetails',
      chain: 'ethereum',
      contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    },
  },
  getTokenPrice: {
    label: 'getTokenPrice',
    description: 'Worker action: Fetch live price & 24h change for a single token',
    json: {
      action: 'getTokenPrice',
      chain: 'ethereum',
      contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    },
  },
  getTokenPrices: {
    label: 'getTokenPrices (Batch)',
    description: 'Worker action: Batch query prices for multiple tokens',
    json: {
      action: 'getTokenPrices',
      tokens: [
        {
          chain: 'ethereum',
          contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
        },
        {
          chain: 'polygon',
          contractAddress: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
        },
      ],
    },
  },
  inspectToken: {
    label: 'inspectToken',
    description: 'Worker action: Security audit & inspection analysis',
    json: {
      action: 'inspectToken',
      chain: 'ethereum',
      contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    },
  },
  getAllTokens: {
    label: 'getAllTokens',
    description: 'Worker action: Fetch paginated token directory',
    json: {
      action: 'getAllTokens',
      page: 1,
      limit: 100,
    },
  },
  getTokenByAddress: {
    label: 'getTokenByAddress',
    description: 'Worker action: Lookup token existence in directory',
    json: {
      action: 'getTokenByAddress',
      blockchain: 'polygon',
      contractAddress: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    },
  },
};

export const ApiConsoleModal: React.FC<ApiConsoleModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'vercel' | 'worker'>('vercel');
  const [selectedKey, setSelectedKey] = useState<string>('vercel_token_details');
  const [requestJson, setRequestJson] = useState<string>(
    JSON.stringify(VERCEL_TEMPLATES.vercel_token_details.json, null, 2)
  );

  const [isLoading, setIsLoading] = useState(false);
  const [responseResult, setResponseResult] = useState<any>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [copiedReq, setCopiedReq] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);

  if (!isOpen) return null;

  const handleSwitchTab = (tab: 'vercel' | 'worker') => {
    setActiveTab(tab);
    if (tab === 'vercel') {
      setSelectedKey('vercel_token_details');
      setRequestJson(JSON.stringify(VERCEL_TEMPLATES.vercel_token_details.json, null, 2));
    } else {
      setSelectedKey('getTokenDetails');
      setRequestJson(JSON.stringify(WORKER_TEMPLATES.getTokenDetails.json, null, 2));
    }
    setJsonError(null);
    setResponseResult(null);
    setHttpStatus(null);
  };

  const handleSelectTemplate = (key: string) => {
    setSelectedKey(key);
    if (activeTab === 'vercel') {
      const tmpl = VERCEL_TEMPLATES[key];
      if (tmpl) setRequestJson(JSON.stringify(tmpl.json, null, 2));
    } else {
      const tmpl = WORKER_TEMPLATES[key];
      if (tmpl) setRequestJson(JSON.stringify(tmpl.json, null, 2));
    }
    setJsonError(null);
  };

  const handleRunRequest = async () => {
    setJsonError(null);
    let parsedPayload: any = {};

    if (activeTab === 'vercel') {
      const tmpl = VERCEL_TEMPLATES[selectedKey];
      if (tmpl && tmpl.method === 'POST') {
        try {
          parsedPayload = JSON.parse(requestJson);
        } catch (err: any) {
          setJsonError(`JSON Syntax Error: ${err.message}`);
          return;
        }
      }
    } else {
      try {
        parsedPayload = JSON.parse(requestJson);
      } catch (err: any) {
        setJsonError(`JSON Syntax Error: ${err.message}`);
        return;
      }
    }

    setIsLoading(true);
    setResponseResult(null);
    setHttpStatus(null);

    const startTime = performance.now();

    try {
      if (activeTab === 'vercel') {
        const tmpl = VERCEL_TEMPLATES[selectedKey];
        const targetUrl = tmpl?.endpoint || '/api/health';
        const method = tmpl?.method || 'POST';

        const options: RequestInit = {
          method,
          headers: { 'Content-Type': 'application/json' },
        };

        if (method === 'POST') {
          options.body = JSON.stringify(parsedPayload);
        }

        const fetchRes = await fetch(targetUrl, options);
        const endTime = performance.now();
        setExecutionTimeMs(Math.round(endTime - startTime));
        setHttpStatus(fetchRes.status);

        const data = await fetchRes.json();
        setResponseResult(data);
      } else {
        const res = await executeWorkerGenericAction(parsedPayload);
        const endTime = performance.now();
        setExecutionTimeMs(Math.round(endTime - startTime));
        setHttpStatus(200);
        setResponseResult(res);
      }
    } catch (err: any) {
      const endTime = performance.now();
      setExecutionTimeMs(Math.round(endTime - startTime));
      setHttpStatus(500);
      setResponseResult({
        success: false,
        error: {
          code: 'API_REQUEST_FAILED',
          message: err.message || 'API request failed to execute.',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyRequest = () => {
    navigator.clipboard.writeText(requestJson);
    setCopiedReq(true);
    setTimeout(() => setCopiedReq(false), 2000);
  };

  const handleCopyResponse = () => {
    if (responseResult) {
      navigator.clipboard.writeText(JSON.stringify(responseResult, null, 2));
      setCopiedRes(true);
      setTimeout(() => setCopiedRes(false), 2000);
    }
  };

  const activeDescription = activeTab === 'vercel'
    ? VERCEL_TEMPLATES[selectedKey]?.description
    : WORKER_TEMPLATES[selectedKey]?.description;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-[#090C12] border border-emerald-500/30 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white font-sans">
        {/* Header */}
        <div className="p-3.5 px-4 bg-[#0B0E17] border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#4ADE80]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">API Laboratory & Console</h2>
                <span className="text-[9px] bg-emerald-500/15 text-[#4ADE80] border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  Backend Tester
                </span>
              </div>
              <p className="text-[10.5px] text-zinc-400">
                Test Vercel Python Backend endpoints & Cloudflare Worker API actions independently.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Backend Target Selector Bar */}
        <div className="bg-[#04060A] px-4 py-2 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleSwitchTab('vercel')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'vercel'
                  ? 'bg-emerald-500/20 text-[#4ADE80] border border-emerald-500/40 shadow-[0_0_12px_rgba(74,222,128,0.2)]'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Vercel Python Backend</span>
              <span className="text-[9px] bg-emerald-400/20 px-1.5 py-0.2 rounded font-mono font-extrabold text-[#4ADE80]">
                NEW
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('worker')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'worker'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Cloudflare Worker API</span>
            </button>
          </div>

          <div className="text-[10px] text-zinc-400 font-mono hidden sm:block">
            {activeTab === 'vercel' ? 'Target: Python Vercel Runtime' : 'Target: Cloudflare Worker Layer'}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {/* Action Template Pills */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Select {activeTab === 'vercel' ? 'Vercel API Route' : 'Worker Action'}:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {activeTab === 'vercel'
                ? Object.keys(VERCEL_TEMPLATES).map((key) => {
                    const tmpl = VERCEL_TEMPLATES[key];
                    const isSelected = selectedKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectTemplate(key)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#22C55E] text-black font-bold shadow-[0_0_12px_rgba(34,197,94,0.4)]'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                        }`}
                      >
                        {tmpl.label}
                      </button>
                    );
                  })
                : Object.keys(WORKER_TEMPLATES).map((key) => {
                    const tmpl = WORKER_TEMPLATES[key];
                    const isSelected = selectedKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectTemplate(key)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                        }`}
                      >
                        {tmpl.label}
                      </button>
                    );
                  })}
            </div>
            <p className="text-[10.5px] text-zinc-400 italic pt-0.5">{activeDescription}</p>
          </div>

          {/* Grid Layout: Request Editor vs Response Output */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* LEFT: Request JSON Editor */}
            <div className="space-y-2 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1 font-mono">
                  <Code2 className="w-3.5 h-3.5 text-emerald-400" /> Request Payload (JSON):
                </span>
                <button
                  type="button"
                  onClick={handleCopyRequest}
                  className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedReq ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedReq ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <textarea
                value={requestJson}
                onChange={(e) => {
                  setRequestJson(e.target.value);
                  setJsonError(null);
                }}
                rows={12}
                spellCheck={false}
                disabled={activeTab === 'vercel' && VERCEL_TEMPLATES[selectedKey]?.method === 'GET'}
                className="w-full bg-[#04060A] border border-zinc-800 rounded-xl p-3 font-mono text-[11px] text-emerald-300 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/40 transition-all leading-relaxed disabled:opacity-50"
              />

              {jsonError && (
                <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-2 text-rose-300 text-[10.5px] font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}

              {/* Execute Button */}
              <button
                type="button"
                onClick={handleRunRequest}
                disabled={isLoading}
                className={`w-full py-2.5 px-4 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.98] disabled:opacity-50 ${
                  activeTab === 'vercel'
                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 hover:from-emerald-500 hover:to-green-400 text-black shadow-[0_4px_20px_rgba(34,197,94,0.3)]'
                    : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black shadow-[0_4px_20px_rgba(245,158,11,0.3)]'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Executing Request...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black text-black" />
                    <span>Run {activeTab === 'vercel' ? 'Vercel API' : 'Worker'} Request</span>
                  </>
                )}
              </button>
            </div>

            {/* RIGHT: Response JSON Output */}
            <div className="space-y-2 flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1 font-mono">
                    <Database className="w-3.5 h-3.5 text-blue-400" /> Response Payload:
                  </span>
                  {httpStatus && (
                    <span className="text-[9.5px] bg-emerald-500/20 text-[#4ADE80] border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                      {httpStatus} OK ({executionTimeMs}ms)
                    </span>
                  )}
                </div>

                {responseResult && (
                  <button
                    type="button"
                    onClick={handleCopyResponse}
                    className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedRes ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRes ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              <div className="w-full bg-[#04060A] border border-zinc-800 rounded-xl p-3 font-mono text-[11.5px] text-zinc-200 min-h-[280px] max-h-[380px] overflow-y-auto [overflow-wrap:anywhere]">
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-zinc-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#4ADE80]" />
                    <p className="text-xs">Querying API Endpoint...</p>
                  </div>
                ) : responseResult ? (
                  <pre className="whitespace-pre-wrap text-emerald-400 font-mono text-[11px] leading-relaxed">
                    {JSON.stringify(responseResult, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-600 space-y-1">
                    <Terminal className="w-8 h-8 text-zinc-700" />
                    <p className="text-xs font-semibold">No response yet</p>
                    <p className="text-[10.5px]">Click "Run Request" to execute the test query.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#0B0E17] border-t border-zinc-800 text-[10px] text-zinc-500 font-mono flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#4ADE80]" />
            {activeTab === 'vercel' ? 'Vercel API Standalone Service' : 'Cloudflare Worker Target'}
          </span>
          <span>Parallel API Architecture v1.0</span>
        </div>
      </div>
    </div>
  );
};
