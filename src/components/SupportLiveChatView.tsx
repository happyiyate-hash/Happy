import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  Paperclip,
  X,
  Bot,
  Trash2,
  CheckCheck,
  Sparkles,
  HelpCircle,
  Clock,
  ShieldCheck,
  Smile,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { TokenCareLogo } from './TokenCareLogo';
import { useTranslation } from '../utils/i18n';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'support' | 'system';
  text: string;
  timestamp: string;
  attachmentName?: string;
  attachmentType?: 'image' | 'file';
}

interface SupportLiveChatViewProps {
  onBack: () => void;
  onNavigateHelpCenter?: () => void;
  currentUser?: any;
}

const STORAGE_CHAT_KEY = 'tokencare_support_chat_history_v1';

export const SupportLiveChatView: React.FC<SupportLiveChatViewProps> = ({
  onBack,
  onNavigateHelpCenter,
  currentUser,
}) => {
  const { t } = useTranslation();

  const initialChatMessages: ChatMessage[] = [
    {
      id: 'welcome-1',
      sender: 'support',
      text: t('liveChat.welcome1', 'Hello! Welcome to TokenCare Live Support. 👋 How can our team assist you today?'),
      timestamp: t('liveChat.justNow', 'Just now'),
    },
    {
      id: 'welcome-2',
      sender: 'support',
      text: t('liveChat.welcome2', 'You can ask about token verification, honeypot safety audits, reward payouts, or account security. Our on-chain specialists typically reply in under 2 minutes.'),
      timestamp: t('liveChat.justNow', 'Just now'),
    },
  ];

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return initialChatMessages;
  });

  const [chatInput, setChatInput] = useState('');
  const [chatAttachment, setChatAttachment] = useState<{ name: string; type: 'image' | 'file' } | null>(null);
  const [isSupportTyping, setIsSupportTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll chat to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isSupportTyping]);

  // Persist chat to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(chatMessages));
    } catch (e) {
      console.warn('Failed to persist chat messages:', e);
    }
  }, [chatMessages]);

  // Handle sending a chat message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() && !chatAttachment) return;

    const userText = chatInput.trim();
    const attachment = chatAttachment;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachmentName: attachment ? attachment.name : undefined,
      attachmentType: attachment ? attachment.type : undefined,
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    setChatAttachment(null);
    setIsSupportTyping(true);

    // Automatic contextual support response simulation
    setTimeout(() => {
      let replyText = t(
        'liveChat.defaultReply',
        'Thank you for contacting TokenCare Support. An on-chain specialist has received your message and is reviewing your request.'
      );

      const lower = userText.toLowerCase();
      if (lower.includes('reward') || lower.includes('balance') || lower.includes('unclaimed')) {
        replyText = t(
          'liveChat.replyReward',
          'Regarding your reward balance: TokenCare awards 15–25 REWARD tokens per verified unique ERC-20 contract. You can track your balance on the Overview tab and request withdrawals to your saved Polygon address on the "Payouts & Server" hub.'
        );
      } else if (lower.includes('withdraw') || lower.includes('payout') || lower.includes('polygon') || lower.includes('wallet')) {
        replyText = t(
          'liveChat.replyWithdraw',
          'To withdraw your REWARD tokens: Ensure your Polygon EVM address is saved in Settings. Minimum withdrawal is 10 REWARD tokens. Payout transactions are broadcasted securely via our non-custodial Supabase backend.'
        );
      } else if (lower.includes('verify') || lower.includes('honeypot') || lower.includes('audit') || lower.includes('scam')) {
        replyText = t(
          'liveChat.replyVerify',
          'TokenCare executes multi-step static bytecode analysis, simulation transfer checks, and liquidity lock verifications. If a contract fails audit, it is flagged as unsafe in the directory.'
        );
      } else if (lower.includes('2fa') || lower.includes('mfa') || lower.includes('authenticator') || lower.includes('security')) {
        replyText = t(
          'liveChat.reply2fa',
          'You can set up Time-based One-Time Passwords (TOTP) anytime in Settings > Two-Factor Authentication (2FA) or via the dedicated 2FA Security view with Google Authenticator, Authy, or 1Password.'
        );
      } else if (lower.includes('bug') || lower.includes('error') || lower.includes('crash') || lower.includes('not working')) {
        replyText = t(
          'liveChat.replyBug',
          'We have logged this issue to our diagnostics board. If you have screenshots or a transaction hash, please attach them here and we will investigate immediately.'
        );
      } else if (lower.includes('donate') || lower.includes('donation')) {
        replyText = t(
          'liveChat.replyDonate',
          'You can donate directly to verified causes or contract creators from the Donate page using USDT, USDC, or native MATIC/ETH with zero platform commission.'
        );
      }

      const supportReply: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: 'support',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, supportReply]);
      setIsSupportTyping(false);
    }, 1100);
  };

  const handleClearChat = () => {
    setChatMessages(initialChatMessages);
    localStorage.removeItem(STORAGE_CHAT_KEY);
  };

  const quickQuestions = [
    t('liveChat.qWithdraw', 'How to withdraw rewards?'),
    t('liveChat.qUnverified', 'Why is my token unverified?'),
    t('liveChat.q2fa', 'How to enable 2FA?'),
    t('liveChat.qHoneypot', 'How does honeypot check work?'),
    t('liveChat.qAddress', 'Change saved wallet address'),
  ];

  return (
    <div
      id="tokencare-live-chat-page"
      className="h-full w-full flex flex-col min-h-0 bg-[#06080E] text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black overflow-hidden relative"
    >
      {/* 1. STANDALONE TOP HEADER - MATCHES TOP NAVIGATION BAR & STATUS BAR COLOR, NO BORDER AT BOTTOM */}
      <header
        id="chat-top-header"
        className="shrink-0 z-30 bg-[#090C12] px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 shadow-none border-none"
      >
        {/* Left: Unwrapped White Back Arrow + TokenCare Logo + Title & Live Status */}
        <div className="flex items-center space-x-2 min-w-0">
          <button
            id="chat-back-btn"
            onClick={onBack}
            className="p-1 -ml-1 text-white hover:text-emerald-400 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>

          {/* TokenCare Logo placed right close to the arrow */}
          <div className="relative shrink-0 flex items-center justify-center">
            <TokenCareLogo size="sm" showText={false} />
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E575] border-2 border-[#090C12] absolute -bottom-0.5 -right-0.5 animate-pulse" />
          </div>

          {/* Support Title & Live Status Indicator */}
          <div className="min-w-0 pl-0.5">
            <div className="flex items-center space-x-1.5">
              <h1 className="text-xs sm:text-sm font-bold text-white truncate tracking-tight">
                {t('liveChat.title', 'TokenCare Live Support')}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[8.5px] bg-emerald-500/15 text-[#00E575] border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold font-mono">
                {t('liveChat.deskBadge', 'DESK')}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-emerald-400 flex items-center gap-1 font-medium truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E575]" />
              <span>{t('liveChat.activeNow', 'Active Now • Replies in < 2 mins')}</span>
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-1 shrink-0">
          {onNavigateHelpCenter && (
            <button
              id="chat-faq-btn"
              onClick={onNavigateHelpCenter}
              className="text-zinc-400 hover:text-white p-1.5 text-xs font-semibold rounded-lg hover:bg-zinc-800/60 transition-all cursor-pointer flex items-center gap-1"
              title="Open Knowledgebase"
              aria-label="Help Center"
            >
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline text-xs">{t('liveChat.helpBtn', 'Help')}</span>
            </button>
          )}

          <button
            id="chat-clear-btn"
            onClick={handleClearChat}
            className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800/60 transition-colors cursor-pointer"
            title="Clear Chat History"
            aria-label="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. CHAT MESSAGES BODY - ONLY THIS AREA SCROLLS (Native Messenger experience) */}
      <main
        id="chat-messages-container"
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 sm:px-6 py-4 space-y-3.5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0A1220] via-[#06080E] to-[#06080E] scrollbar-thin"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Date divider */}
        <div className="flex items-center justify-center my-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-[#0B0F19] border border-zinc-800/80 px-3 py-1 rounded-full shadow-sm">
            {t('liveChat.encryptedSession', 'Today • Encrypted Support Session')}
          </span>
        </div>

        {/* Messages Feed */}
        {chatMessages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-150`}
            >
              <div className={`flex items-end space-x-2 max-w-[88%] sm:max-w-[75%]`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#0E2E21] to-[#154633] border border-emerald-500/30 flex items-center justify-center text-[#00E575] shrink-0 mb-1 shadow-sm">
                    <TokenCareLogo size="sm" showText={false} />
                  </div>
                )}

                <div
                  className={`rounded-2xl p-3 sm:p-3.5 text-xs sm:text-[13px] leading-relaxed shadow-md transition-all ${
                    isUser
                      ? 'bg-gradient-to-r from-[#15803D] via-[#16A34A] to-[#22C55E] text-black font-semibold rounded-br-xs shadow-[0_2px_14px_rgba(34,197,94,0.25)]'
                      : 'bg-[#0E131F] border border-zinc-800/90 text-zinc-100 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                  {/* Attachment card */}
                  {msg.attachmentName && (
                    <div
                      className={`mt-2 pt-2 border-t text-[11px] font-mono flex items-center gap-1.5 font-bold ${
                        isUser ? 'border-black/20 text-black' : 'border-zinc-800 text-emerald-400'
                      }`}
                    >
                      {msg.attachmentType === 'image' ? (
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{msg.attachmentName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamp & Status Checkmarks */}
              <div
                className={`flex items-center space-x-1 text-[10px] text-zinc-500 pt-1 ${
                  isUser ? 'pr-1' : 'pl-9'
                }`}
              >
                <span>{msg.timestamp}</span>
                {isUser && <CheckCheck className="w-3 h-3 text-[#00E575]" />}
              </div>
            </div>
          );
        })}

        {/* Live Typing Indicator */}
        {isSupportTyping && (
          <div className="flex items-center space-x-2 text-xs text-zinc-400 animate-in fade-in">
            <div className="w-7 h-7 rounded-xl bg-[#0E2E21] border border-emerald-500/30 flex items-center justify-center text-[#00E575] shrink-0">
              <Bot className="w-3.5 h-3.5 text-[#00E575]" />
            </div>
            <div className="bg-[#0E131F] border border-zinc-800 rounded-2xl px-3.5 py-2 text-[11px] text-zinc-300 flex items-center space-x-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E575] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E575] animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E575] animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 text-[10.5px] text-zinc-400">{t('liveChat.typing', 'TokenCare Support is typing...')}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* 3. QUICK SUGGESTIONS CHIPS (Above Input) */}
      <div
        id="chat-quick-suggestions"
        className="shrink-0 px-3 sm:px-5 py-2 bg-[#080B11] border-t border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none"
      >
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>{t('liveChat.quick', 'Quick:')}</span>
        </span>
        {quickQuestions.map((quick, qIdx) => (
          <button
            key={qIdx}
            type="button"
            onClick={() => {
              setChatInput(quick);
              chatInputRef.current?.focus();
            }}
            className="text-[11px] font-medium px-2.5 py-1 bg-zinc-900/90 hover:bg-emerald-500/15 border border-zinc-800 hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-300 rounded-lg whitespace-nowrap transition-all cursor-pointer shrink-0 shadow-sm"
          >
            {quick}
          </button>
        ))}
      </div>

      {/* 4. FIXED MESSAGE INPUT BAR - AT THE VERY BOTTOM (Never scrolls away) */}
      <footer
        id="chat-bottom-input-bar"
        className="shrink-0 bg-[#090C13] border-t border-zinc-800/90 p-2.5 sm:p-3 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
      >
        {/* Attachment preview banner */}
        {chatAttachment && (
          <div className="mb-2 max-w-md mx-auto flex items-center justify-between bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs text-emerald-300 animate-in fade-in">
            <div className="flex items-center space-x-2 truncate">
              {chatAttachment.type === 'image' ? (
                <ImageIcon className="w-3.5 h-3.5 text-[#00E575] shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-[#00E575] shrink-0" />
              )}
              <span className="truncate font-mono font-bold text-[11px]">{chatAttachment.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setChatAttachment(null)}
              className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
              title="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          className="max-w-4xl mx-auto flex items-center gap-2"
        >
          {/* Hidden File Input */}
          <input
            type="file"
            ref={chatFileInputRef}
            className="hidden"
            accept="image/*,.pdf,.log,.txt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const isImage = file.type.startsWith('image/');
                setChatAttachment({
                  name: file.name,
                  type: isImage ? 'image' : 'file',
                });
              }
            }}
          />

          {/* Attach Button */}
          <button
            type="button"
            onClick={() => chatFileInputRef.current?.click()}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
              chatAttachment
                ? 'bg-emerald-500/20 border-emerald-500/50 text-[#00E575]'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title={t('liveChat.attachFile', 'Attach screenshot or diagnostic log')}
            aria-label="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Text Input Field */}
          <input
            ref={chatInputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={t('liveChat.inputPlaceholder', 'Type a message to TokenCare Support...')}
            className="flex-1 bg-[#06080E] border border-zinc-800 text-white placeholder-zinc-500 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 sm:py-3 focus:outline-none focus:border-[#00E575] focus:ring-1 focus:ring-[#00E575]/40 transition-all font-normal"
          />

          {/* Send Button */}
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!chatInput.trim() && !chatAttachment}
            className="p-2.5 sm:p-3 bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] hover:from-[#16A34A] hover:to-[#4ADE80] text-black font-black rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_2px_12px_rgba(34,197,94,0.3)] shrink-0"
            title={t('liveChat.send', 'Send Message')}
            aria-label="Send Message"
          >
            <Send className="w-4 h-4 fill-black" />
          </button>
        </form>
      </footer>
    </div>
  );
};

