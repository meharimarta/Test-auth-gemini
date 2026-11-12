import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { MailMessage } from '../types/auth';

interface MailpitViewProps {
  onTriggerAction: (actionPath: string) => void;
  onMessagesChanged: () => void;
}

export function MailpitView({ onTriggerAction, onMessagesChanged }: MailpitViewProps) {
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMessages() {
    setLoading(true);
    try {
      const res = await apiRequest<{ messages: MailMessage[] }>('/api/mail');
      setMessages(res.messages);
      if (res.messages.length > 0 && !selectedId) {
        setSelectedId(res.messages[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  async function handleSelect(msg: MailMessage) {
    setSelectedId(msg.id);
    if (!msg.readAt) {
      await apiRequest(`/api/mail/${msg.id}/read`, { method: 'POST' });
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, readAt: new Date().toISOString() } : m)),
      );
      onMessagesChanged();
    }
  }

  async function handleClearInbox() {
    await apiRequest('/api/mail', { method: 'DELETE' });
    setMessages([]);
    setSelectedId(null);
    onMessagesChanged();
  }

  const selected = messages.find((m) => m.id === selectedId) ?? messages[0] ?? null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">Mailpit Local Inbox</h1>
          <p className="mt-1 text-sm text-slate-500">
            Captures outgoing email verification links and password reset tokens dispatched by the auth server.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearInbox}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Inbox
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          Loading captured messages...
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
          <p className="font-display text-base font-medium text-slate-900">No messages in inbox</p>
          <p className="text-sm text-slate-500">
            Register a new account or request a password reset link to inspect live emails here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid lg:grid-cols-12 min-h-[440px]">
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 divide-y divide-slate-100">
            {messages.map((msg) => {
              const active = selected?.id === msg.id;
              return (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => handleSelect(msg)}
                  className={`w-full text-left px-5 py-4 transition-colors ${
                    active ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-900 truncate">{msg.to}</span>
                    <span className="font-mono text-[11px] tabular-nums text-slate-400 shrink-0">
                      {new Date(msg.sentAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-sm truncate ${
                      msg.readAt ? 'text-slate-600' : 'font-semibold text-slate-900'
                    }`}
                  >
                    {msg.subject}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
            {selected ? (
              <div className="space-y-6">
                <div className="pb-5 border-b border-slate-100 space-y-1.5">
                  <h2 className="font-display text-lg font-semibold text-slate-900">
                    {selected.subject}
                  </h2>
                  <p className="text-xs text-slate-500">
                    To: <span className="font-medium text-slate-800">{selected.to}</span>
                    <span className="mx-2" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(selected.sentAt).toLocaleString()}
                    </span>
                  </p>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">{selected.body}</p>

                {selected.token && (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-1.5">
                    <span className="text-xs font-medium text-slate-500">Signed Token</span>
                    <p className="font-mono text-xs text-slate-800 break-all">{selected.token}</p>
                  </div>
                )}

                {selected.actionPath && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onTriggerAction(selected.actionPath!)}
                      className="px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      {selected.type === 'verify_email'
                        ? 'Verify Email Address Now'
                        : 'Open Password Reset Form'}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
