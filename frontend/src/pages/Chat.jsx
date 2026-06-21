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
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--color-border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--color-bg-secondary)',
        }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700 }}>RAG Chat</h1>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Self-healing · Citations · Confidence scoring
            </p>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          padding: '16px 24px',
          borderTop: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-secondary)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
            <input
              id={inputId}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="input-field"
              disabled={isLoading}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !query.trim()}
              style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isLoading ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
            </button>
          </form>
        </div>
      </div>

      {/* Sources pane — 40% */}
      <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Confidence header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>Sources & Confidence</h2>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Retrieved context chunks</p>
          </div>
          {currentConfidence !== null && (
            <ConfidenceBadge confidence={currentConfidence} size={64} />
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
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: isUser ? 'row-reverse' : 'row' }}>
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: isUser ? 'var(--gradient-violet)' : 'rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isUser ? <User size={14} color="white" /> : <Bot size={14} color="var(--color-violet-light)" />}
        </div>

        {/* Bubble */}
        <div className={isUser ? 'message-user' : 'message-assistant'}>
          <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </p>

          {/* Metadata for assistant messages */}
          {!isUser && !message.isError && message.confidence !== undefined && (
            <div style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid var(--color-border-subtle)',
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}>
              <span className={`badge ${message.confidence >= 0.70 ? 'badge-emerald' : 'badge-rose'}`}>
                {message.is_grounded ? <CheckCircle size={9} /> : <XCircle size={9} />}
                {message.is_grounded ? 'Grounded' : 'Ungrounded'}
              </span>
              <span className="badge badge-violet">
                {Math.round(message.confidence * 100)}% confidence
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                {message.processing_time_ms?.toFixed(0)}ms
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
    <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Bot size={14} color="var(--color-violet-light)" />
      </div>
      <div className="message-assistant" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--color-violet-light)',
              animation: `pulse-glow 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 6 }}>
            Healing & generating...
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const examples = [
    'What is the self-attention mechanism?',
    'Explain the RAG retrieval pipeline',
    'How does hallucination detection work?',
  ];
  const { addMessage } = useAppStore();
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(124,58,237,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', border: '1px solid rgba(124,58,237,0.3)',
        }}>
          <Bot size={24} color="var(--color-violet-light)" />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Ask your knowledge base</h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
          Upload documents first, then ask anything
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 340 }}>
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              const event = { preventDefault: () => {} };
              document.querySelector('input[type="text"]').value = ex;
            }}
            style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)',
              borderRadius: 10, padding: '10px 14px', color: 'var(--color-text-secondary)',
              fontSize: 13, cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border-subtle)'}
          >
            "{ex}"
          </button>
        ))}
      </div>
    </div>
  );
}
