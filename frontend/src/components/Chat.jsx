import { useState } from "react";

export default function Chat() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Welcome! Let's assess your AI readiness." }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;

    // Add user message
    setMessages(prev => [
      ...prev,
      { role: "user", text: userMessage }
    ]);

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await res.json();

      // Add bot response
      setMessages(prev => [
        ...prev,
        { role: "bot", text: data.reply }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "bot", text: "Error connecting to server." + err }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.chatBox}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "#DCF8C6" : "#EEE"
            }}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div style={styles.inputArea}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your answer..."
        />
        <button style={styles.button} onClick={sendMessage} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "700px",
    margin: "40px auto",
    display: "flex",
    flexDirection: "column",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "20px",
    background: "#fff"
  },
  chatBox: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minHeight: "400px",
    marginBottom: "15px"
  },
  message: {
    padding: "10px 14px",
    borderRadius: "10px",
    maxWidth: "75%"
  },
  inputArea: {
    display: "flex",
    gap: "10px"
  },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc"
  },
  button: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "6px",
    background: "#333",
    color: "#fff",
    cursor: "pointer"
  }
};