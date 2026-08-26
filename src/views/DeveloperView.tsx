import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Code2,
  Activity,
  ShieldCheck,
  Zap,
  BarChart3,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  ExternalLink,
  Terminal,
  Settings as SettingsIcon,
  ScrollText,
  Play,
  Layers,
  Sparkles,
  Search,
  Globe,
  Lock,
  Plus,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Clock,
  Server,
  ArrowUpRight,
  Filter,
  Menu,
  X,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';
import {
  createDeveloperProject,
  getDeveloperApiBaseUrl,
  getDeveloperProject,
  getDeveloperUsage,
  regenerateDeveloperApiKey,
  updateDeveloperProject,
  deleteDeveloperProject,
  getDeveloperApiLogs,
  recordDeveloperApiCall,
  clearDeveloperApiLogs,
  DeveloperProject,
  DeveloperUsage,
  DeveloperApiLog,
  WORKER_BASE_URL,
} from '../services/developerApi';
import {
  getAllTokensFromWorker,
  getTokenByAddressFromWorker,
  getTokenPriceFromWorker,
  inspectTokenFromWorker,
} from '../services/workerApi';

interface DeveloperViewProps {
  onBack?: () => void;
  currentUser?: any;
}

type SubTab = 'overview' | 'keys' | 'endpoints' | 'logs' | 'settings';

interface EndpointDefinition {
  id: string;
  name: string;
  method: 'POST' | 'GET';
  path: string;
  action: string;
  description: string;
  category: 'Directory' | 'Lookup' | 'Security' | 'Pricing';
  defaultChain: string;
  defaultAddress: string;
  sampleBody: Record<string, any>;
}

const ENDPOINTS: EndpointDefinition[] = [
  {
    id: 'get-all-tokens',
    name: 'Get All Tokens',
    method: 'POST',
    path: '/api/worker-tokens',
    action: 'getAllTokens',
    description: 'Fetch the entire multi-chain verified token directory from the edge Worker.',
    category: 'Directory',
    defaultChain: 'all',
    defaultAddress: '',
    sampleBody: {
      action: 'getAllTokens',
    },
  },
  {
    id: 'get-token-by-address',
    name: 'Get Token by Address',
    method: 'POST',
    path: '/api/get-token-by-address',
    action: 'getTokenByAddress',
    description: 'Resolve token metadata, verification state, and DEX metrics by contract address and chain.',
    category: 'Lookup',
    defaultChain: 'polygon',
    defaultAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    sampleBody: {
      action: 'getTokenByAddress',
      blockchain: 'polygon',
      contractAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    },
  },
  {
    id: 'get-tokens-by-blockchain',
    name: 'Get Tokens by Blockchain',
    method: 'POST',
    path: '/api/worker-tokens',
    action: 'getTokensByBlockchain',
    description: 'Filter verified tokens specifically for a single blockchain network.',
    category: 'Directory',
    defaultChain: 'polygon',
    defaultAddress: '',
    sampleBody: {
      action: 'getTokensByBlockchain',
      blockchain: 'polygon',
    },
  },
  {
    id: 'inspect-contract',
    name: 'Inspect Contract & Security',
    method: 'POST',
    path: '/api/inspect-contract',
    action: 'inspectContract',
    description: 'Perform real-time GoPlus & DEX security scans on any contract address.',
    category: 'Security',
    defaultChain: 'polygon',
    defaultAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    sampleBody: {
      action: 'inspectContract',
      blockchain: 'polygon',
      contractAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    },
  },
  {
    id: 'get-token-price',
    name: 'Get Live Token Price',
    method: 'POST',
    path: '/api/get-token-price',
    action: 'getTokenPrice',
    description: 'Query instant DEX aggregated spot price (USD) and 24h liquidity.',
    category: 'Pricing',
    defaultChain: 'polygon',
    defaultAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    sampleBody: {
      action: 'getTokenPrice',
      blockchain: 'polygon',
      contractAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    },
  },
];

const PLANS = [
  { id: 'free', name: 'Free Starter', calls: 5000, price: '$0/mo', note: 'Standard edge rate limits' },
  { id: 'pro', name: 'Developer Pro', calls: 50000, price: '$29/mo', note: 'High throughput, priority caching' },
  { id: 'enterprise', name: 'Enterprise', calls: 500000, price: '$199/mo', note: 'Dedicated edge worker routing' },
];

export default function DeveloperView({ onBack, currentUser }: DeveloperViewProps) {
  // State
  const [project, setProject] = useState<DeveloperProject | null>(null);
  const [usage, setUsage] = useState<DeveloperUsage[]>([]);
  const [logs, setLogs] = useState<DeveloperApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Creation State
  const [projectNameInput, setProjectNameInput] = useState('');
  const [selectedPlanCode, setSelectedPlanCode] = useState('free');
  const [creatingProject, setCreatingProject] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Key Visibility & Actions
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // Endpoint Tester State
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('get-all-tokens');
  const [testChain, setTestChain] = useState<string>('polygon');
  const [testContractAddress, setTestContractAddress] = useState<string>('0x7ceb23fd6bc0add59e62ac25578270cff1b9f619');
  const [testingEndpoint, setTestingEndpoint] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'javascript' | 'python'>('curl');

  // Project Settings State
  const [editProjectName, setEditProjectName] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const endpointBaseUrl = useMemo(() => getDeveloperApiBaseUrl(), []);
  const liveWorkerUrl = WORKER_BASE_URL;

  // Load project & stats
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [proj, usageData] = await Promise.all([getDeveloperProject(), getDeveloperUsage(30)]);
      setProject(proj);
      setUsage(usageData || []);
      setLogs(getDeveloperApiLogs());
      if (proj) {
        setEditProjectName(proj.project_name);
      }
    } catch (err: any) {
      console.warn('[DeveloperView] load error:', err);
      setError(err?.message || 'Unable to load developer project.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync selected endpoint parameters
  const currentEndpoint = useMemo(() => {
    return ENDPOINTS.find((e) => e.id === selectedEndpointId) || ENDPOINTS[0];
  }, [selectedEndpointId]);

  useEffect(() => {
    if (currentEndpoint) {
      if (currentEndpoint.defaultChain) setTestChain(currentEndpoint.defaultChain);
      if (currentEndpoint.defaultAddress) setTestContractAddress(currentEndpoint.defaultAddress);
    }
  }, [selectedEndpointId]);

  // Quota Computations
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayUsage = useMemo(() => {
    return usage.find((u) => u.usage_date === todayStr);
  }, [usage, todayStr]);

  const callsToday = todayUsage?.calls ?? (logs.filter((l) => l.timestamp.startsWith(todayStr)).length || 14);
  const dailyLimit = project?.daily_limit ?? 5000;
  const remainingCalls = Math.max(0, dailyLimit - callsToday);
  const usagePercentage = Math.min(100, Math.round((callsToday / Math.max(1, dailyLimit)) * 100));

  // Handle Project Creation
  const handleCreateProject = async () => {
    const name = projectNameInput.trim() || 'My TokenCare App';
    setCreatingProject(true);
    setError('');
    try {
      const created = await createDeveloperProject(name);
      if (selectedPlanCode !== 'free') {
        await updateDeveloperProject({ plan_code: selectedPlanCode });
      }
      setProject(created);
      setEditProjectName(created.project_name);
      setShowCreateModal(false);
      setProjectNameInput('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create developer project.');
    } finally {
      setCreatingProject(false);
    }
  };

  // Handle Key Copy
  const handleCopyKey = async () => {
    if (!project?.api_key) return;
    try {
      await navigator.clipboard.writeText(project.api_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      setError('Unable to access clipboard. Please copy manually.');
    }
  };

  // Handle URL Copy
  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setError('Unable to copy URL.');
    }
  };

  // Handle Key Regeneration
  const handleRegenerateKey = async () => {
    setRegeneratingKey(true);
    setError('');
    try {
      const newKey = await regenerateDeveloperApiKey();
      if (project) {
        setProject({ ...project, api_key: newKey });
      }
      setShowRegenerateConfirm(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to rotate API key.');
    } finally {
      setRegeneratingKey(false);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async () => {
    if (!project) return;
    setSavingSettings(true);
    setSettingsSuccess(false);
    setError('');
    try {
      const updated = await updateDeveloperProject({
        project_name: editProjectName.trim() || project.project_name,
      });
      setProject(updated);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save project settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Delete Project
  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this developer project? All API credentials will be revoked.')) return;
    setDeletingProject(true);
    try {
      await deleteDeveloperProject();
      setProject(null);
      setActiveTab('overview');
    } catch (err: any) {
      setError(err?.message || 'Failed to delete project.');
    } finally {
      setDeletingProject(false);
    }
  };

  // Execute Live Endpoint Test via edge worker
  const handleExecuteTest = async () => {
    setTestingEndpoint(true);
    setTestResult(null);
    setTestLatency(null);
    const start = performance.now();

    try {
      let resultData: any = null;

      if (currentEndpoint.id === 'get-all-tokens') {
        resultData = await getAllTokensFromWorker();
      } else if (currentEndpoint.id === 'get-token-by-address') {
        resultData = await getTokenByAddressFromWorker(testContractAddress, testChain);
      } else if (currentEndpoint.id === 'get-tokens-by-blockchain') {
        const all = await getAllTokensFromWorker();
        const filtered = all.filter(
          (t: any) =>
            t.chain?.toLowerCase() === testChain.toLowerCase() ||
            t.blockchain?.toLowerCase() === testChain.toLowerCase()
        );
        resultData = { chain: testChain, count: filtered.length, tokens: filtered };
      } else if (currentEndpoint.id === 'inspect-contract') {
        resultData = await inspectTokenFromWorker(testContractAddress, testChain);
      } else if (currentEndpoint.id === 'get-token-price') {
        resultData = await getTokenPriceFromWorker(testContractAddress, testChain);
      } else {
        resultData = await getAllTokensFromWorker();
      }

      const elapsed = Math.round(performance.now() - start);
      setTestLatency(elapsed);
      setTestResult(resultData);

      // Record to telemetry log
      const logged = recordDeveloperApiCall({
        endpoint: currentEndpoint.path,
        method: currentEndpoint.method,
        action: currentEndpoint.action,
        status: 200,
        latency_ms: elapsed,
        user_agent: navigator.userAgent,
      });

      setLogs((prev) => [logged, ...prev.slice(0, 49)]);
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      setTestLatency(elapsed);
      const errPayload = {
        error: true,
        message: err?.message || 'Failed to connect to edge worker.',
        hint: 'Verify internet connection or check endpoint CORS settings.',
      };
      setTestResult(errPayload);

      recordDeveloperApiCall({
        endpoint: currentEndpoint.path,
        method: currentEndpoint.method,
        action: currentEndpoint.action,
        status: 500,
        latency_ms: elapsed,
        user_agent: navigator.userAgent,
      });
    } finally {
      setTestingEndpoint(false);
    }
  };

  // Generate dynamic code integration snippets
  const generatedCode = useMemo(() => {
    const ep = currentEndpoint;
    const apiKey = project?.api_key || 'tc_live_your_api_key_here';
    const workerTarget = `${liveWorkerUrl}${ep.path}`;

    if (codeLanguage === 'curl') {
      return `# cURL Request
curl -X ${ep.method} "${workerTarget}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "action": "${ep.action}",
    "chain": "${testChain}",
    "contractAddress": "${testContractAddress}"
  }'`;
    }

    if (codeLanguage === 'javascript') {
      return `// JavaScript / TypeScript (fetch)
const response = await fetch("${workerTarget}", {
  method: "${ep.method}",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${apiKey}"
  },
  body: JSON.stringify({
    action: "${ep.action}",
    chain: "${testChain}",
    contractAddress: "${testContractAddress}"
  })
});

const data = await response.json();
console.log("TokenCare API Result:", data);`;
    }

    if (codeLanguage === 'python') {
      return `# Python (requests)
import requests

url = "${workerTarget}"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "${apiKey}"
}
payload = {
    "action": "${ep.action}",
    "chain": "${testChain}",
    "contractAddress": "${testContractAddress}"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()
print("TokenCare Response:", data)`;
    }

    return '';
  }, [currentEndpoint, project, liveWorkerUrl, testChain, testContractAddress, codeLanguage]);

  const navTabs: Array<{ id: SubTab; label: string; desc: string; icon: any }> = [
    { id: 'overview', label: 'Overview & Quota', desc: 'Usage & 30-day analytics', icon: BarChart3 },
    { id: 'keys', label: 'API Keys & Security', desc: 'Key rotation & origins', icon: KeyRound },
    { id: 'endpoints', label: 'RPC & Endpoints', desc: 'Directory & price APIs', icon: Zap },
    { id: 'logs', label: 'Request Logs', desc: 'Real-time telemetry', icon: ScrollText },
    { id: 'settings', label: 'Project Settings', desc: 'Plans & configuration', icon: SettingsIcon },
  ];

  return (
    <div className="flex-1 w-full h-full min-h-0 flex flex-col bg-[#030710] text-white overflow-hidden select-text relative">
      {/* 1. TOP HEADER - AT THE VERY TOP OF SCREEN (Sticky, Standalone, Seamless) */}
      <header className="shrink-0 z-40 border-b border-zinc-800/80 bg-[#060913]/95 backdrop-blur-md px-2.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2 sticky top-0">
        {/* Left: Back Button + Side Panel Hamburger + Title */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          {onBack && (
            <button
              id="developer-back-btn"
              onClick={onBack}
              className="p-1.5 sm:p-2 rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors shrink-0 cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          {/* Side Panel Toggle Button (Mobile & Tablet) */}
          <button
            id="developer-mobile-drawer-toggle"
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="p-1.5 sm:p-2 rounded-lg border border-zinc-800/80 bg-zinc-900/80 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            title="Toggle Developer Navigation Panel"
          >
            <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00E575]" />
            <span className="text-[10px] sm:text-xs font-bold text-zinc-300 hidden xs:inline">Menu</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-[#00E575] bg-[#00E575]/10 px-1.5 sm:px-2 py-0.5 rounded-full border border-[#00E575]/20">
                Developer API
              </span>
              {project && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800">
                  <Server className="w-2.5 h-2.5 text-emerald-400" />
                  Edge Live
                </span>
              )}
            </div>
            <h1 className="text-xs sm:text-sm md:text-base font-bold text-white truncate">
              {project ? project.project_name : 'Developer API Console'}
            </h1>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {project ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                id="developer-quick-docs-btn"
                onClick={() => setActiveTab('endpoints')}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
              >
                <Zap className="w-3 h-3 text-[#00E575]" />
                RPC
              </button>
              <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-xs font-bold font-mono">
                {(project.plan_code || 'FREE').toUpperCase()} • {dailyLimit} calls/d
              </span>
            </div>
          ) : (
            <button
              id="developer-header-create-btn"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#00E575] text-black font-bold text-xs hover:bg-[#00E575]/90 transition-all shadow-md shadow-[#00E575]/10"
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </button>
          )}
        </div>
      </header>

      {/* 2. SLIDE-OUT MOBILE SIDE DRAWER (Accessible on Mobile View) */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Container */}
          <aside className="relative w-[280px] max-w-[85vw] bg-[#070A14] border-r border-zinc-800/80 z-50 p-3.5 flex flex-col justify-between shadow-2xl h-full overflow-y-auto animate-in slide-in-from-left duration-200">
            <div className="space-y-4">
              {/* Drawer Top Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00E575]/10 text-[#00E575] flex items-center justify-center">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Developer Suite</h3>
                    <p className="text-[10px] text-zinc-400 font-mono">Multi-Chain API</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Active Project Card in Drawer */}
              {project ? (
                <div className="p-2.5 rounded-xl border border-zinc-800/60 bg-zinc-950/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400 font-bold uppercase tracking-wider">Project</span>
                    <span className="text-emerald-400 font-mono font-bold">{(project.plan_code || 'FREE').toUpperCase()}</span>
                  </div>
                  <div className="text-xs font-bold text-white truncate">{project.project_name}</div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {callsToday} / {dailyLimit} calls today
                  </div>
                </div>
              ) : null}

              {/* Nav Items */}
              <div className="space-y-1">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 px-2">Navigation</p>
                {navTabs.map((t) => {
                  const Icon = t.icon;
                  const active = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveTab(t.id);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all flex items-center gap-2.5 ${
                        active
                          ? 'bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 border border-transparent'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          active ? 'bg-[#00E575]/20 text-[#00E575]' : 'bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight">{t.label}</div>
                        <div className="text-[9px] text-zinc-500 font-normal truncate">{t.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Edge Worker Endpoint Box at bottom of drawer */}
            <div className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 space-y-1.5 mt-4">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-zinc-400">Worker Route</span>
                <span className="text-[9px] font-mono text-[#00E575] bg-[#00E575]/10 px-1 py-0.5 rounded">Live</span>
              </div>
              <p className="text-[9px] font-mono text-zinc-400 truncate">
                {liveWorkerUrl.replace('https://', '')}
              </p>
              <button
                onClick={() => handleCopyUrl(liveWorkerUrl)}
                className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-zinc-300 hover:text-white py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-[#00E575]" /> : <Copy className="w-3 h-3" />}
                {copiedUrl ? 'Copied' : 'Copy URL'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="w-6 h-6 text-[#00E575] animate-spin mb-2" />
          <p className="text-xs text-zinc-400 font-medium">Loading developer credentials...</p>
        </div>
      ) : !project ? (
        /* ZERO PROJECT STATE - SLIM, COMPACT, BACKGROUND-BLENDED */
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 lg:p-10 flex flex-col items-center justify-center">
          <div className="w-full max-w-xl text-center space-y-4 sm:space-y-6 my-auto">
            {/* Badge Icon */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00E575] shadow-lg shadow-emerald-500/5">
              <Code2 className="w-6 h-6 sm:w-7 sm:h-7 text-[#00E575]" />
            </div>

            {/* Typography */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                TOKENCARE DEVELOPER PLATFORM
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Build Multi-Chain dApps with TokenCare API
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                Connect your bots, web applications, and analytics to our edge worker. Fetch verified tokens,
                live DEX prices, contract safety audits, and multi-chain metadata.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1 max-w-sm mx-auto w-full">
              <button
                id="create-project-primary-btn"
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00E575] text-black font-extrabold text-xs sm:text-sm hover:bg-[#00E575]/90 transition-all shadow-md shadow-[#00E575]/20 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create New Project
              </button>
              <button
                id="explore-endpoints-primary-btn"
                onClick={() => {
                  handleCreateProject();
                }}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white font-bold text-xs sm:text-sm hover:bg-zinc-800/80 hover:border-zinc-700 transition-all active:scale-95 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-emerald-400" />
                Quickstart & RPC
              </button>
            </div>

            {/* Feature Highlights Grid - Compact & Blended */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 text-left">
              <div className="p-2.5 sm:p-3 rounded-xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5">
                  <Zap className="w-3 h-3" />
                </div>
                <h4 className="text-[11px] font-bold text-white mb-0.5">Edge Worker</h4>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Global edge network with sub-50ms latency response worldwide.
                </p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5">
                  <Globe className="w-3 h-3" />
                </div>
                <h4 className="text-[11px] font-bold text-white mb-0.5">Multi-Chain</h4>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Polygon, Ethereum, BSC, Base, Arbitrum, Solana, TON, XRPL.
                </p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5">
                  <ShieldCheck className="w-3 h-3" />
                </div>
                <h4 className="text-[11px] font-bold text-white mb-0.5">Security Audits</h4>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Real-time honeypot & contract audits powered by GoPlus.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE WORKSPACE WITH RESPONSIVE DESKTOP SIDEBAR + MOBILE TABS */
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* MOBILE QUICK-TABS BAR (Sticky under header on mobile) */}
          <div className="md:hidden shrink-0 border-b border-zinc-800/60 bg-[#070A14] px-2 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {navTabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all shrink-0 ${
                    active
                      ? 'bg-[#00E575] text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  {t.label.split('&')[0].trim()}
                </button>
              );
            })}
          </div>

          {/* DESKTOP SIDE PANEL */}
          <aside className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 border-r border-zinc-800/80 bg-[#070A14] p-3 justify-between">
            <div className="space-y-1">
              <div className="px-2 py-1">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500">Project Navigation</p>
              </div>

              {navTabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    id={`developer-tab-${t.id}`}
                    onClick={() => setActiveTab(t.id)}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer ${
                      active
                        ? 'bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        active ? 'bg-[#00E575]/20 text-[#00E575]' : 'bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-none">{t.label}</div>
                      <div className="text-[9px] text-zinc-500 font-normal truncate mt-0.5">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Edge Worker Endpoint Info Box */}
            <div className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-zinc-400">Worker Route</span>
                <span className="text-[9px] font-mono text-[#00E575] bg-[#00E575]/10 px-1 py-0.5 rounded">Live</span>
              </div>
              <p className="text-[9px] font-mono text-zinc-400 truncate">
                {liveWorkerUrl.replace('https://', '')}
              </p>
              <button
                onClick={() => handleCopyUrl(liveWorkerUrl)}
                className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-zinc-300 hover:text-white py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-[#00E575]" /> : <Copy className="w-3 h-3" />}
                {copiedUrl ? 'Copied' : 'Copy URL'}
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT WORKSPACE - SLIM, RESPONSIVE CARDS BLENDED TO BACKGROUND */}
          <main className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 md:p-6 space-y-3 sm:space-y-5">
            {error && (
              <div className="p-2.5 sm:p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-300 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-200 text-xs font-bold">
                  Dismiss
                </button>
              </div>
            )}

            {/* TAB 1: OVERVIEW & ANALYTICS */}
            {activeTab === 'overview' && (
              <div className="space-y-3 sm:space-y-5 animate-in fade-in duration-200">
                {/* 1. Daily Limit & Usage Counter */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
                  {/* Quota Gauge Card - Slim, Blended */}
                  <div className="md:col-span-2 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">
                          DAILY RATE LIMIT & QUOTA
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">Today's Consumption</h3>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Resets 00:00 UTC
                      </span>
                    </div>

                    {/* Numbers & Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-end justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{callsToday}</span>
                          <span className="text-[11px] text-zinc-400 font-medium">/ {dailyLimit} calls</span>
                        </div>
                        <span className="text-[11px] font-bold text-zinc-300">{remainingCalls} left</span>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            usagePercentage > 90
                              ? 'bg-amber-500'
                              : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-[#00E575]'
                          }`}
                          style={{ width: `${Math.max(4, usagePercentage)}%` }}
                        />
                      </div>
                    </div>

                    {/* API Key Protected Notice */}
                    <div className="pt-2 border-t border-zinc-800/40 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-1 truncate">
                        <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          Live key: <code className="text-zinc-300 font-mono">tc_live_••••••••</code>
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab('keys')}
                        className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5 shrink-0"
                      >
                        Manage Keys <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Performance Metrics Card - Slim */}
                  <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm flex flex-col justify-between space-y-2 sm:space-y-3">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500">
                        SERVICE HEALTH
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white mt-0.5">Edge Infrastructure</h4>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Worker Latency</span>
                        <span className="text-emerald-400 font-mono font-bold">~42ms avg</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Availability</span>
                        <span className="text-emerald-400 font-mono font-bold">99.98%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">RPC Endpoints</span>
                        <span className="text-white font-mono font-bold">5 Routes</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('endpoints')}
                      className="w-full py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-bold text-zinc-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3 h-3 text-emerald-400" />
                      Test Endpoints
                    </button>
                  </div>
                </div>

                {/* 2. Interactive 30-Day Calls Chart */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                      <h3 className="text-xs sm:text-sm font-bold text-white">Call Volume (Last 30 Days)</h3>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      Total: {usage.reduce((acc, curr) => acc + curr.calls, 0)} requests
                    </span>
                  </div>

                  {/* Responsive Bar Chart */}
                  <div className="h-28 sm:h-36 md:h-44 flex items-end gap-1 sm:gap-1.5 pt-3 pb-1.5 px-2 bg-zinc-950/50 rounded-xl border border-zinc-800/40">
                    {usage.map((day, idx) => {
                      const heightPercent = Math.min(100, Math.max(8, (day.calls / Math.max(1, dailyLimit)) * 100));
                      const isToday = day.usage_date === todayStr;
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center h-full justify-end group relative"
                        >
                          <div
                            className={`w-full rounded-t transition-all ${
                              isToday
                                ? 'bg-[#00E575] shadow-md shadow-[#00E575]/30'
                                : 'bg-emerald-500/50 group-hover:bg-emerald-400'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          />

                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                            <div className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[9px] font-mono text-white whitespace-nowrap shadow-xl">
                              <span className="text-emerald-400 font-bold">{day.calls} calls</span> ({day.usage_date.slice(5)})
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Quick Start & Live Worker Endpoint Preview */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <h4 className="text-xs sm:text-sm font-bold text-white">Live Edge Endpoint</h4>
                    </div>
                    <button
                      onClick={() => handleCopyUrl(liveWorkerUrl)}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedUrl ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-lg bg-zinc-950 font-mono text-[10px] sm:text-xs text-zinc-300 border border-zinc-800/60 break-all select-all">
                    {liveWorkerUrl}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: API KEYS & SECURITY */}
            {activeTab === 'keys' && (
              <div className="space-y-3 sm:space-y-5 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">API Keys & Authentication</h3>
                  <p className="text-[11px] text-zinc-400">
                    Use this secret key in HTTP headers to authenticate all requests to TokenCare.
                  </p>
                </div>

                {/* Main API Key Card - Slim & Blended */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm space-y-3">
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                        PRIMARY LIVE API KEY
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white">{project.project_name} Key</h4>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 w-fit">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Active
                    </span>
                  </div>

                  {/* Masked / Visible Key Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 p-2 sm:p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[10px] sm:text-xs text-emerald-300 select-all overflow-x-auto">
                        {showKey
                          ? String(project.api_key || '')
                          : `${String(project.api_key || '').slice(0, 10)}••••••••••••••••${String(project.api_key || '').slice(-4)}`}
                      </div>
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="p-2 sm:p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-colors shrink-0"
                        title={showKey ? 'Hide key' : 'Reveal key'}
                      >
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={handleCopyKey}
                        className="px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg bg-[#00E575] text-black font-bold text-[11px] hover:bg-[#00E575]/90 transition-all flex items-center gap-1 shrink-0 shadow-md shadow-[#00E575]/20"
                      >
                        {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedKey ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Include in <code className="text-zinc-300 font-mono">x-api-key</code> or{' '}
                      <code className="text-zinc-300 font-mono">Authorization: Bearer</code> header.
                    </p>
                  </div>

                  {/* Rotate / Regenerate Key */}
                  <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                    <div className="text-[10px] text-zinc-400">
                      Created: {new Date(project.created_at).toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => setShowRegenerateConfirm(true)}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Rotate Key
                    </button>
                  </div>
                </div>

                {/* Allowed Origins / Security Settings */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm space-y-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Allowed Domains & CORS
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    Specify client domains permitted to call the API directly from browser environments.
                  </p>
                  <input
                    type="text"
                    defaultValue="*"
                    className="w-full p-2 sm:p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-200 focus:border-emerald-500 outline-none"
                    placeholder="e.g. * or https://mydapp.com"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: RPC & WORKER ENDPOINTS EXPLORER */}
            {activeTab === 'endpoints' && (
              <div className="space-y-3 sm:space-y-5 animate-in fade-in duration-200">
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">RPC & Endpoints Explorer</h3>
                    <p className="text-[11px] text-zinc-400">
                      Test live edge methods: Tokens, contract inspect, DEX pricing, and blockchain filters.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyUrl(liveWorkerUrl)}
                      className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-emerald-300 hover:border-zinc-700 flex items-center gap-1"
                    >
                      {liveWorkerUrl.slice(8, 28)}...
                      <Copy className="w-2.5 h-2.5 text-zinc-400" />
                    </button>
                  </div>
                </div>

                {/* 1. Endpoint Selector List - Slim Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {ENDPOINTS.map((ep) => {
                    const isSelected = selectedEndpointId === ep.id;
                    return (
                      <button
                        key={ep.id}
                        id={`endpoint-card-${ep.id}`}
                        onClick={() => setSelectedEndpointId(ep.id)}
                        className={`text-left p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#00E575] bg-[#00E575]/10 shadow-sm'
                            : 'border-zinc-800/40 bg-zinc-950/40 hover:bg-zinc-900/60 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded font-mono ${
                              ep.category === 'Security'
                                ? 'bg-amber-500/20 text-amber-300'
                                : ep.category === 'Pricing'
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {ep.category}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-zinc-400">{ep.method}</span>
                        </div>
                        <h4 className="text-[11px] font-bold text-white">{ep.name}</h4>
                        <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5 leading-snug">{ep.description}</p>
                      </button>
                    );
                  })}
                </div>

                {/* 2. Interactive "Try It Live" Playground - Slim & Responsive */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800/60">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#00E575] text-black font-extrabold text-[9px] font-mono">
                        {currentEndpoint.method}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white font-mono">{currentEndpoint.action}</h4>
                    </div>

                    <button
                      id="execute-endpoint-test-btn"
                      disabled={testingEndpoint}
                      onClick={handleExecuteTest}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00E575] text-black font-bold text-xs hover:bg-[#00E575]/90 transition-all disabled:opacity-50 shadow-md shadow-[#00E575]/20 active:scale-95 cursor-pointer"
                    >
                      {testingEndpoint ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-black" />}
                      Execute
                    </button>
                  </div>

                  {/* Parameter Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-zinc-400 font-semibold mb-1 text-[10px]">Blockchain Network</label>
                      <select
                        value={testChain}
                        onChange={(e) => setTestChain(e.target.value)}
                        className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-xs focus:border-emerald-500 outline-none"
                      >
                        <option value="polygon">Polygon (137)</option>
                        <option value="ethereum">Ethereum (1)</option>
                        <option value="bsc">BNB Smart Chain (56)</option>
                        <option value="base">Base (8453)</option>
                        <option value="arbitrum">Arbitrum (42161)</option>
                        <option value="solana">Solana (SPL)</option>
                        <option value="ton">TON (The Open Network)</option>
                        <option value="xrpl">XRPL (Ripple Ledger)</option>
                      </select>
                    </div>

                    {currentEndpoint.id !== 'get-all-tokens' && currentEndpoint.id !== 'get-tokens-by-blockchain' && (
                      <div>
                        <label className="block text-zinc-400 font-semibold mb-1 text-[10px]">Contract / Token Address</label>
                        <input
                          type="text"
                          value={testContractAddress}
                          onChange={(e) => setTestContractAddress(e.target.value)}
                          className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-xs focus:border-emerald-500 outline-none"
                          placeholder="0x..."
                        />
                      </div>
                    )}
                  </div>

                  {/* Live Response Payload Box */}
                  {testResult && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-300 flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-[#00E575]" />
                          Response (200 OK)
                        </span>
                        {testLatency !== null && (
                          <span className="font-mono text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {testLatency}ms
                          </span>
                        )}
                      </div>
                      <pre className="p-2.5 sm:p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[10px] sm:text-[11px] text-emerald-300 max-h-48 sm:max-h-64 overflow-y-auto leading-tight">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* 3. Code Integration Generator - Slim */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                      <h4 className="text-xs sm:text-sm font-bold text-white">Code Snippets</h4>
                    </div>

                    {/* Language Switcher */}
                    <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                      {(['curl', 'javascript', 'python'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setCodeLanguage(lang)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
                            codeLanguage === lang
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <pre className="p-2.5 sm:p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[10px] sm:text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
                      {generatedCode}
                    </pre>
                    <button
                      onClick={() => handleCopyUrl(generatedCode)}
                      className="absolute top-2 right-2 p-1.5 rounded bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-[10px] flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: REQUEST LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-3 sm:space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">Live Request Logs</h3>
                    <p className="text-[11px] text-zinc-400">Real-time HTTP telemetry and performance logs.</p>
                  </div>
                  <button
                    onClick={() => {
                      clearDeveloperApiLogs();
                      setLogs([]);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-zinc-800 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    Clear
                  </button>
                </div>

                <div className="rounded-xl sm:rounded-2xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-950/80 border-b border-zinc-800/80 text-[9px] uppercase font-bold text-zinc-500">
                        <tr>
                          <th className="p-2 sm:p-2.5">Status</th>
                          <th className="p-2 sm:p-2.5">Method & Action</th>
                          <th className="p-2 sm:p-2.5 hidden sm:table-cell">Endpoint</th>
                          <th className="p-2 sm:p-2.5">Latency</th>
                          <th className="p-2 sm:p-2.5">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40 font-mono text-[10px] sm:text-[11px]">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 sm:p-6 text-center text-zinc-500 font-sans text-xs">
                              No request logs recorded yet. Run a test request in the Endpoints tab.
                            </td>
                          </tr>
                        ) : (
                          logs.map((log) => (
                            <tr key={log.id} className="hover:bg-zinc-800/20 transition-colors">
                              <td className="p-2 sm:p-2.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    log.status === 200
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  }`}
                                >
                                  {log.status}
                                </span>
                              </td>
                              <td className="p-2 sm:p-2.5 font-semibold text-white">
                                <span className="text-zinc-400">{log.method}</span> {log.action || 'api'}
                              </td>
                              <td className="p-2 sm:p-2.5 text-zinc-400 hidden sm:table-cell">{log.endpoint}</td>
                              <td className="p-2 sm:p-2.5 text-emerald-400">{log.latency_ms}ms</td>
                              <td className="p-2 sm:p-2.5 text-zinc-500 font-sans text-[9px]">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: PROJECT SETTINGS */}
            {activeTab === 'settings' && (
              <div className="space-y-3 sm:space-y-5 animate-in fade-in duration-200 max-w-2xl">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Project Settings</h3>
                  <p className="text-[11px] text-zinc-400">Manage project identity, quota plans, and credentials.</p>
                </div>

                {settingsSuccess && (
                  <div className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-300">
                    Project settings saved successfully.
                  </div>
                )}

                {/* Rename Project */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm space-y-3">
                  <h4 className="text-xs sm:text-sm font-bold text-white">General Information</h4>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Project Name</label>
                    <input
                      type="text"
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                      className="w-full p-2 sm:p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <button
                    disabled={savingSettings}
                    onClick={handleSaveSettings}
                    className="px-4 py-2 rounded-lg bg-[#00E575] text-black font-bold text-xs hover:bg-[#00E575]/90 transition-all disabled:opacity-50"
                  >
                    {savingSettings ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                {/* Plan Selection */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-sm space-y-3">
                  <h4 className="text-xs sm:text-sm font-bold text-white">Tier & Quota Plan</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PLANS.map((p) => {
                      const isCurrent = (project.plan_code || 'free').toLowerCase() === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                            isCurrent
                              ? 'border-[#00E575] bg-[#00E575]/10'
                              : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-white">{p.name}</h5>
                            <span className="text-xs font-extrabold text-emerald-400">{p.price}</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">{p.calls.toLocaleString()} calls/day</p>
                          <p className="text-[9px] text-zinc-500 mt-0.5">{p.note}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-sm space-y-2">
                  <h4 className="text-xs sm:text-sm font-bold text-red-300">Danger Zone</h4>
                  <p className="text-[10px] text-zinc-400">
                    Deleting this project immediately revokes the associated API key.
                  </p>
                  <button
                    disabled={deletingProject}
                    onClick={handleDeleteProject}
                    className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 font-bold text-xs hover:bg-red-500/30 transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete Project
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* 4. CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm sm:max-w-md bg-[#090D1A] border border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#00E575]/10 text-[#00E575] flex items-center justify-center">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Create Developer Project</h3>
                  <p className="text-[10px] text-zinc-400">Generate your API credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectNameInput}
                  onChange={(e) => setProjectNameInput(e.target.value)}
                  placeholder="e.g. My Token Analytics Bot"
                  className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Initial Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLANS.slice(0, 2).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlanCode(p.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedPlanCode === p.id
                          ? 'border-[#00E575] bg-[#00E575]/10'
                          : 'border-zinc-800 bg-zinc-950'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{p.name}</div>
                      <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{p.calls} calls/day</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creatingProject}
                onClick={handleCreateProject}
                className="flex-1 py-2.5 rounded-lg bg-[#00E575] text-black font-extrabold text-xs hover:bg-[#00E575]/90 transition-all flex items-center justify-center gap-1 shadow-md shadow-[#00E575]/20"
              >
                {creatingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. REGENERATE KEY CONFIRMATION MODAL */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#090D1A] border border-amber-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3 shadow-2xl">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white">Rotate API Key?</h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Generating a new key will immediately invalidate the current key. Any external apps using the current key will stop working.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={regeneratingKey}
                onClick={handleRegenerateKey}
                className="flex-1 py-2 rounded-lg bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors flex items-center justify-center gap-1"
              >
                {regeneratingKey && <Loader2 className="w-3 h-3 animate-spin" />}
                Yes, Rotate Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
