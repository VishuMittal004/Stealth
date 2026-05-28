import { Send } from 'lucide-react';
import { useState } from 'react';
import { useChat } from '../hooks/useChat';
import ChatBubble from '../components/ChatBubble';

export default function Coach() {
  const { messages, sending, send } = useChat();
  const [text, setText] = useState('');

  function submit(event) {
    event.preventDefault();
    send(text);
    setText('');
  }

  return (
    <main className="screen" style={{ minHeight: 'calc(100vh - 112px)' }}>
      <header><h1>AI Coach</h1><p>Ask directly. The answer will use your logs.</p></header>
      <section className="card" style={{ flex: 1, minHeight: 360 }}>
        {messages.map((message, index) => <ChatBubble key={`${message.role}-${index}`} message={message} />)}
        {!messages.length && <p>No chat yet. Start with what happened today.</p>}
        {sending && <div className="chat-row assistant"><div className="chat-bubble">Thinking through your logs...</div></div>}
      </section>
      <form className="row" onSubmit={submit}>
        <input className="input" value={text} onChange={(event) => setText(event.target.value)} placeholder="Type in Hindi, English, or Hinglish" />
        <button className="button" disabled={!text.trim() || sending}><Send size={18} /></button>
      </form>
    </main>
  );
}
