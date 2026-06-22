import { useState, useRef, useEffect, useId } from 'react';
import { Send, Trash2, Bot, User, Loader, CheckCircle, XCircle } from 'lucide-react';
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Chat pane — 60% */}
      <div style={{
        flex: '0 0 60%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-primary)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid var(--color-border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--color-bg-secondary)',
        }}>
          <div>
            <div className="step-num">.02 / ENGINE</div>
            <h1 style={{ 
              fontFamily: 'Space Grotesk, sans-serif', 
              fontSize: 18, 
              fontWeight: 700, 
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              RAG Session
            </h1>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
              SELF-HEALING · CITED GROUND TRUTH
            </p>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={11} /> Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '24px 32px',
          borderTop: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-secondary)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12 }}>
            <input
              id={inputId}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Query the index..."
              className="input-field"
              disabled={isLoading}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !query.trim()}
              style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isLoading ? <Loader size={14} style={{ animation: 'spin-slow 2s linear infinite' }} /> : <Send size={14} />}
            </button>
          </form>
        </div>
      </div>

      {/* Sources pane — 40% */}
      <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-bg-secondary)' }}>
        {/* Confidence header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ 
              fontFamily: 'Space Grotesk, sans-serif', 
              fontSize: 13, 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              Telemetry
            </h2>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
              relevance metrics
            </p>
          </div>
          {currentConfidence !== null && (
            <ConfidenceBadge confidence={currentConfidence} size={60} />
          )}
        </div>

        {/* Sources */}
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
      style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexDirection: isUser ? 'row-reverse' : 'row', width: '100%' }}>
        {/* Monogram Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: 2, flexShrink: 0,
          background: isUser ? '#ffffff' : 'rgba(255,255,255,0.05)',
          border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: isUser ? '#000000' : 'var(--color-text-secondary)',
          fontFamily: 'Space Grotesk, sans-serif'
        }}>
          {isUser ? 'U' : 'AI'}
        </div>

        {/* Bubble */}
        <div className={isUser ? 'message-user' : 'message-assistant'}>
          <p style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--color-text-primary)' }}>
            {message.content}
          </p>

          {/* Metadata for assistant messages */}
          {!isUser && !message.isError && message.confidence !== undefined && (
            <div style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid var(--color-border-subtle)',
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}>
              <span className={`badge ${message.confidence >= 0.70 ? 'badge-emerald' : 'badge-rose'}`}>
                {message.is_grounded ? <CheckCircle size={10} /> : <XCircle size={10} />}
                {message.is_grounded ? 'Grounded' : 'Ungrounded'}
              </span>
              <span className="badge badge-violet">
                {Math.round(message.confidence * 100)}% conf
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', alignSelf: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
                {message.processing_time_ms?.toFixed(0)}ms latency
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 2,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)',
        fontFamily: 'Space Grotesk, sans-serif'
      }}>
        AI
      </div>
      <div className="message-assistant" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 4, height: 4, borderRadius: '50%',
              background: 'var(--color-text-secondary)',
              animation: `spin-slow 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)', marginLeft: 6 }}>
            HEALING RETRIEVAL & GENERATING...
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const examples = [
    'Explain the RAG retrieval pipeline',
    'What is the self-attention mechanism?',
    'How does hallucination detection work?',
  ];
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 32,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 2,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Bot size={20} color="var(--color-text-secondary)" />
        </div>
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Query Console
        </h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          Enter a prompt below to run the Self-Healing RAG loop.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 360 }}>
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              const inp = document.querySelector('input[type="text"]');
              if (inp) {
                inp.value = ex;
                // Dispatch event to update React state
                const ev = new Event('input', { bubbles: true });
                inp.dispatchEvent(ev);
                inp.focus();
              }
            }}
            style={{
              background: '#141416', border: '1px solid var(--color-border)',
              borderRadius: 2, padding: '12px 16px', color: 'var(--color-text-secondary)',
              fontSize: 12, cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              fontFamily: 'Outfit, sans-serif'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ffffff'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
          >
            "{ex}"
          </button>
        ))}
      </div>
    </div>
  );
}
