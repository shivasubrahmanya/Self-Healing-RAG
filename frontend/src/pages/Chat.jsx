import { useState, useRef, useEffect, useId } from 'react';
import { Send, Trash2, Bot, Loader, CheckCircle, XCircle, User, Sparkles } from 'lucide-react';
import { sendChat } from '../services/api';
import { useAppStore } from '../store/appStore';
import ConfidenceBadge from '../components/Chat/ConfidenceBadge';
import SourcesPanel from '../components/Chat/SourcesPanel';
import SubpageHeader from '../components/Layout/SubpageHeader';

export default function Chat() {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const messagesEndRef = useRef(null);
  const {
    messages, isLoading, sessionId,
    currentSources, currentConfidence, currentHealing,
    addMessage, setLoading, setSessionId, setCurrentResponse, clearChat,
  } = useAppStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', width: '100%' }}>
      {/* Top Navigation */}
      <div style={{ padding: '16px 32px 0 32px', background: 'var(--bg-secondary)' }}>
        <SubpageHeader title="Query Engine" />
      </div>

      {/* Main workspace split */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100%' }}>
        {/* Chat pane — 60% */}
        <div style={{
          flex: '0 0 60%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--color-border)',
          background: 'var(--bg-secondary)',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 32px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
          }}>
            <div>
              <h1 style={{ 
                fontSize: '20px', 
                fontWeight: 700,
                color: 'var(--text-light)', 
                lineHeight: 1.2
              }}>
                Query Session
              </h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Self-healing retrieval and context-guided execution.
            </p>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
              <Trash2 size={12} /> Clear Chat
            </button>
          )}
        </div>

        {/* Messages list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {messages.length === 0 ? (
            <EmptyState />
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

        {/* Input form */}
        <div style={{
          padding: '20px 32px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--bg-secondary)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <input
              id={inputId}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about indexed sources..."
              className="input-field"
              disabled={isLoading}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !query.trim()}
              style={{ height: '44px', width: '90px' }}
            >
              {isLoading ? <Loader size={16} style={{ animation: 'loading 1.5s infinite' }} /> : 'Send'}
            </button>
          </form>
        </div>
      </div>

      {/* Sources pane — 40% */}
      <div style={{ 
        flex: '0 0 40%', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        background: 'var(--bg-primary)',
        borderLeft: '1px solid var(--color-border)'
      }}>
        {/* Telemetry header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: 700,
              color: 'var(--text-light)'
            }}>
              Diagnostics
            </h2>
            <p className="eyebrow" style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              relevance metrics
            </p>
          </div>
          {currentConfidence !== null && (
            <ConfidenceBadge confidence={currentConfidence} size={52} />
          )}
        </div>

        {/* Sources scroll panel */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
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
        gap: 16,
        width: '100%',
        alignItems: 'flex-start',
        flexDirection: isUser ? 'row-reverse' : 'row'
      }}
    >
      {/* Avatar Icon */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: isUser ? 'var(--accent-light)' : 'rgba(255, 255, 255, 0.03)',
        border: isUser ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isUser ? 'var(--accent)' : 'var(--text-light)',
        flexShrink: 0,
      }}>
        {isUser ? <User size={14} /> : <Sparkles size={14} />}
      </div>

      {/* Message Bubble */}
      <div style={{ flex: 1, maxWidth: '75%', textAlign: isUser ? 'right' : 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
          <span className="eyebrow" style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
            {isUser ? 'user query' : 'healing agent response'}
          </span>
        </div>

        <div className={isUser ? 'message-user' : 'message-assistant'}>
          <p style={{ 
            fontSize: 14, 
            lineHeight: 1.6, 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word', 
            color: 'var(--text-light)',
            fontWeight: 400,
            textAlign: 'left'
          }}>
            {message.content}
          </p>
        </div>

        {/* Telemetry data for assistant */}
        {!isUser && !message.isError && message.confidence !== undefined && (
          <div style={{
            marginTop: 8,
            display: 'inline-flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            background: 'var(--bg-surface)',
            padding: '6px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: 6
          }}>
            <span style={{ 
              fontSize: 10, 
              fontFamily: 'Inter', 
              fontWeight: 600, 
              color: message.confidence >= 0.70 ? 'var(--color-emerald)' : 'var(--color-rose)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              {message.is_grounded ? (
                <>
                  <CheckCircle size={10} style={{ color: 'var(--color-emerald)' }} /> grounded
                </>
              ) : (
                <>
                  <XCircle size={10} style={{ color: 'var(--color-rose)' }} /> ungrounded
                </>
              )}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'Inter' }}>
              &middot; {Math.round(message.confidence * 100)}% confidence
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'Inter' }}>
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
    <div className="animate-fade-in" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-light)',
      }}>
        <Sparkles size={14} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="eyebrow" style={{ fontSize: 9, color: 'var(--text-secondary)', marginBottom: 4 }}>
          healing agent
        </div>
        <div className="message-assistant" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '12px 18px' }}>
          <div className="skeleton" style={{ width: 16, height: 16, borderRadius: '50%' }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Expanding query contexts and generating verified answer...
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const examples = [
    'Explain the self-attention mechanism',
    'What is the retrieval pipeline configuration?',
    'How does hallucination scoring run?',
  ];
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      maxWidth: 500, margin: '40px auto 0'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-light)', marginBottom: 8 }}>
          Consult the index
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Submit a query to execute the multi-step retrieval state machine. The engine will automatically expand query scopes and retry if results are insufficient.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              const inp = document.querySelector('input[type="text"]');
              if (inp) {
                inp.value = ex;
                const ev = new Event('input', { bubbles: true });
                inp.dispatchEvent(ev);
                inp.focus();
              }
            }}
            className="btn-ghost"
            style={{
              padding: '14px 20px',
              borderRadius: '10px',
              justifyContent: 'space-between',
              width: '100%',
              fontSize: '13px'
            }}
          >
            <span>"{ex}"</span>
            <span style={{ fontSize: 14, color: 'var(--accent)' }}>&rarr;</span>
          </button>
        ))}
      </div>
    </div>
  );
}
