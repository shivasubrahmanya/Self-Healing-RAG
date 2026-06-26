import { useState, useRef, useEffect, useId } from 'react';
import { Send, Trash2, Bot, Loader, CheckCircle, XCircle, User, Sparkles, Cpu, Database } from 'lucide-react';
import { sendChat } from '../services/api';
import { useAppStore } from '../store/appStore';
import ConfidenceBadge from '../components/Chat/ConfidenceBadge';
import SourcesPanel from '../components/Chat/SourcesPanel';

export default function Chat() {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const messagesEndRef = useRef(null);
  const {
    messages, isLoading, sessionId,
    currentSources, currentConfidence, currentHealing,
    addMessage, setLoading, setSessionId, setCurrentResponse, clearChat,
    addQueryHistoryPoint,
  } = useAppStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { role: 'user', content: trimmed, id: Date.now() };
    addMessage(userMessage);
    setQuery('');
    setLoading(true);

    try {
      const result = await sendChat(trimmed, sessionId);
      if (!sessionId) setSessionId(result.session_id);

      const assistantMessage = {
        role: 'assistant',
        content: result.answer,
        id: Date.now() + 1,
        confidence: result.confidence,
        context_score: result.context_score,
        is_grounded: result.is_grounded,
        processing_time_ms: result.processing_time_ms,
      };
      addMessage(assistantMessage);
      setCurrentResponse({
        sources: result.sources,
        confidence: result.confidence,
        healing: result.healing,
      });

      // Record this search trace dynamically
      addQueryHistoryPoint({
        hash: `RAG-${Math.floor(1000 + Math.random() * 9000)}`,
        summary: trimmed,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: `${Math.round(result.confidence * 100)}%`,
        status: result.is_grounded ? 'grounded' : 'self-healed',
        healing: result.healing
      });
    } catch (err) {
      addMessage({
        role: 'assistant',
        content: `❌ Error: ${err.message}`,
        id: Date.now() + 1,
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100%', height: '100%' }}>

      {/* 1. Chat Workspace Pane (65%) */}
      <div style={{
        flex: '0 0 65%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--color-border)',
        background: 'rgba(9, 9, 11, 0.4)',
        backdropFilter: 'blur(12px)',
        height: '100%'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 32px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(18, 18, 20, 0.6)',
        }}>
          <div>
            <h1 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-light)',
              lineHeight: 1.2
            }}>
              Query Session
            </h1>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              Ask questions against vector collections. Healing processes show up in the Diagnostics audit.
            </p>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 11 }}>
              <Trash2 size={12} /> Clear Chat
            </button>
          )}
        </div>

        {/* Messages List Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {messages.length === 0 ? (
            <EmptyState setQuery={setQuery} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* User Query Form Panel */}
        <div style={{
          padding: '20px 32px',
          borderTop: '1px solid var(--color-border)',
          background: 'rgba(18, 18, 20, 0.6)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              id={inputId}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about system logs or configuration..."
              className="input-field"
              disabled={isLoading}
              style={{ flex: 1, height: '40px', fontSize: '13px' }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !query.trim()}
              style={{ height: '40px', padding: '0 16px', fontSize: '12px' }}
            >
              {isLoading ? <Loader size={14} style={{ animation: 'loading 1.5s infinite' }} /> : 'Send'}
            </button>
          </form>
        </div>
      </div>

      {/* 2. Side Diagnostics Panel (35%) */}
      <div style={{
        flex: '0 0 35%',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        background: 'rgba(18, 18, 20, 0.55)',
        backdropFilter: 'blur(16px)',
        height: '100%'
      }}>
        {/* Diagnostics Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-light)' }}>
              Diagnostics
            </h2>
            <div className="eyebrow" style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 2 }}>
              TELEMETRY & SEARCH TRACE
            </div>
          </div>
          {currentConfidence !== null && (
            <ConfidenceBadge confidence={currentConfidence} size={48} />
          )}
        </div>

        {/* Diagnostics Sources Scroll */}
        <div style={{ flex: 1 }}>
          <SourcesPanel sources={currentSources} healing={currentHealing} />
        </div>
      </div>

    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        gap: 12,
        width: '100%',
        alignItems: 'flex-start',
        flexDirection: isUser ? 'row-reverse' : 'row'
      }}
    >
      {/* Icon Avatar */}
      <div style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: isUser ? 'var(--accent-light)' : 'var(--bg-secondary)',
        border: isUser ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isUser ? 'var(--accent)' : 'var(--text-light)',
        flexShrink: 0,
      }}>
        {isUser ? <User size={12} /> : <Sparkles size={12} />}
      </div>

      {/* Bubble text */}
      <div style={{ flex: 1, maxWidth: '80%', textAlign: isUser ? 'right' : 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
          <span className="eyebrow" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
            {isUser ? 'user' : 'aether RAG pipeline'}
          </span>
        </div>

        <div className={isUser ? 'message-user' : 'message-assistant'} style={{ textAlign: 'left', padding: '12px 16px', borderRadius: 8 }}>
          <p style={{
            fontSize: '13px',
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: 'var(--text-light)',
            fontWeight: 400
          }}>
            {message.content}
          </p>
        </div>

        {/* Telemetry info under assistant bubbles */}
        {!isUser && !message.isError && message.confidence !== undefined && (
          <div style={{
            marginTop: 6,
            display: 'inline-flex',
            gap: 10,
            alignItems: 'center',
            background: 'var(--bg-surface)',
            padding: '4px 10px',
            border: '1px solid var(--color-border)',
            borderRadius: 6
          }}>
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              color: message.is_grounded ? 'var(--color-emerald)' : 'var(--color-rose)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              {message.is_grounded ? (
                <>
                  <CheckCircle size={10} /> Grounded
                </>
              ) : (
                <>
                  <XCircle size={10} /> Ungrounded
                </>
              )}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              &middot; {Math.round(message.confidence * 100)}% confidence
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              &middot; {message.processing_time_ms?.toFixed(0)}ms latency
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-light)',
      }}>
        <Sparkles size={12} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="eyebrow" style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: 2 }}>
          healing search loop active
        </div>
        <div className="message-assistant" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 16px', borderRadius: 8 }}>
          <div className="skeleton" style={{ width: 14, height: 14, borderRadius: '50%' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Expanding query contexts and generating verified answer...
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ setQuery }) {
  const examples = [
    {
      text: 'Explain the self-attention mechanism',
      desc: 'Analyze query ambiguity and sub-query transformations.',
      icon: <Sparkles size={16} />
    },
    {
      text: 'What is the retrieval pipeline configuration?',
      desc: 'Check index nodes, thresholds, and cross-encoder rerank windows.',
      icon: <Database size={16} />
    },
    {
      text: 'How does hallucination scoring run?',
      desc: 'Audit grounding verification, judge agents, and latency traces.',
      icon: <Cpu size={16} />
    }
  ];
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 28,
      width: '100%', maxWidth: 840, margin: '0 auto'
    }}>
      <div style={{ textAlign: 'center', maxWidth: 640 }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-light)', marginBottom: 10 }}>
          Aether Query Engine
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Submit queries to traverse the vector index. If the initial search score falls below 0.70, autonomous healing rewrites and retries will optimize the results.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, width: '100%', marginTop: 12 }}>
        {examples.map((ex) => (
          <button
            key={ex.text}
            onClick={() => setQuery(ex.text)}
            className="btn-ghost suggest-query-btn"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '18px',
              borderRadius: '12px',
              textAlign: 'left',
              height: '145px',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              <div style={{ color: 'var(--accent)', opacity: 0.85 }}>{ex.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: 650, color: 'var(--text-light)', lineHeight: 1.3 }}>
                "{ex.text}"
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {ex.desc}
              </div>
            </div>
            <span style={{ fontSize: 13, color: 'var(--accent)', alignSelf: 'flex-end', marginTop: 'auto' }}>&rarr;</span>
          </button>
        ))}
      </div>
    </div>
  );
}
