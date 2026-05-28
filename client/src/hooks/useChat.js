import { useEffect, useState } from 'react';
import api from '../api/client';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get('/chat/history').then(({ data }) => setMessages(data.messages || [])).catch(() => {});
  }, []);

  async function send(content) {
    const text = content.trim();
    if (!text) return;
    setMessages((items) => [...items, { role: 'user', content: text }]);
    setSending(true);
    try {
      const { data } = await api.post('/chat', { message: text });
      setMessages((items) => [...items, { role: 'assistant', content: data.reply }]);
    } finally {
      setSending(false);
    }
  }

  return { messages, sending, send };
}
