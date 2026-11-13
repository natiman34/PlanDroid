import React, { useState, useRef, useEffect } from 'react';
import type { Task, Language } from '../types';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Copy,
  Check,
  Flame,
  Clock,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { getTodayDateString } from '../utils/dateUtils';
import type { StreakStats } from '../utils/streakUtils';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

interface GeminiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  streakStats: StreakStats;
  lang?: Language;
}

const STORAGE_CHAT_KEY = 'plandroid_gemini_chat_history_v1';

export const GeminiChatModal: React.FC<GeminiChatModalProps> = ({
  isOpen,
  onClose,
  tasks,
  streakStats,
  lang = 'en',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_CHAT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: 'welcome-msg',
        role: 'model',
        text: `Hello! I'm your **PlanDroid AI Productivity Coach**. 🚀\n\nI can help you organize your daily work blocks, break down complex projects, prioritize tasks, and keep your **${streakStats.currentStreak}-day focus streak** blazing! 🔥\n\nHow can I help you conquer today's goals?`,
        timestamp: Date.now(),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Save conversation history to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  if (!isOpen) return null;

  const todayStr = getTodayDateString();
  const todayTasks = tasks.filter(t => !t.date || t.date === todayStr);
  const todayCompleted = todayTasks.filter(t => t.completed).length;

  const scheduleSummary = todayTasks
    .map(t => `- ${t.title} [${t.startTime || 'TBD'}-${t.endTime || 'TBD'}] (${t.durationMinutes}m, Priority: ${t.priority}, ${t.completed ? 'COMPLETED' : 'PENDING'})`)
    .join('\n');

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, text: m.text })),
          context: {
            todayDate: new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
            streakDays: streakStats.currentStreak,
            tasksCount: todayTasks.length,
            completedCount: todayCompleted,
            scheduleSummary: scheduleSummary || 'No tasks created yet for today.',
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      const modelReply: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply || 'I am ready to help you plan your next high-impact focus block!',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, modelReply]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ **Unable to connect**: ${err?.message || 'Please check your connection and try again.'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    const welcome: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'model',
      text: "Conversation cleared. Ready for fresh task strategy or scheduling advice!",
      timestamp: Date.now(),
    };
    setMessages([welcome]);
  };

  const suggestedPrompts = [
    "🔥 How do I protect today's 100% streak?",
    "⚡ Break down my next task into 25m focus blocks",
    "📅 Optimize my schedule for afternoon deep work",
    "🧠 Give me a 5-minute cognitive reset ritual",
  ];

  return (
    <div
      role="dialog"
      aria-label="Gemini Productivity Coach"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[92vh] sm:h-[82vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <header className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">PlanDroid AI Coach</h3>
                <span className="text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.2 rounded-full flex items-center gap-1 font-mono">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                  Gemini 3.8
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-1 text-amber-400 font-mono font-bold">
                  <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {streakStats.currentStreak}-Day Streak
                </span>
                <span>•</span>
                <span>{todayCompleted}/{todayTasks.length} Done Today</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearHistory}
              title="Reset conversation"
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[88%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-indigo-950/80 text-indigo-400 border border-indigo-500/30'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed group relative ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap select-text">{msg.text}</div>

                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(msg.id, msg.text)}
                      className="absolute bottom-2 right-2 p-1 rounded-md bg-slate-900/80 text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition cursor-pointer border border-slate-800"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 max-w-[88%] mr-auto">
              <div className="w-7 h-7 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 rounded-tl-none flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="ml-1 text-[11px] text-slate-400 font-medium">Strategizing with Gemini...</span>
              </div>
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/50 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-lg text-[11px] whitespace-nowrap transition cursor-pointer shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3.5 bg-slate-950/90 border-t border-slate-800 flex items-end gap-2 shrink-0"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask your AI coach for schedule advice or task breakdown..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none max-h-28"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition cursor-pointer shadow-sm active:scale-95 shrink-0"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default GeminiChatModal;
