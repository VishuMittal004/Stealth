export default function ChatBubble({ message }) {
  return (
    <div className={`chat-row ${message.role}`}>
      <div className="chat-bubble">{message.content}</div>
    </div>
  );
}
