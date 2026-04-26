import { useEffect, useState } from "react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

function createBotMessage(text, kind = "message") {
  return { role: "bot", text, kind };
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentNode, setCurrentNode] = useState("start");
  const [currentOptions, setCurrentOptions] = useState([]);
  const [conversationState, setConversationState] = useState("question");

  const loadStartNode = async () => {
    setLoading(true);
    setInput("");

    try {
      const res = await fetch(`${API_BASE_URL}/chat`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load the chatbot.");
      }

      setCurrentNode(data.currentNode || "start");
      setCurrentOptions(data.options || []);
      setConversationState(data.status || "question");
      setMessages([
        createBotMessage("Welcome! Let's assess your AI readiness."),
        createBotMessage(data.question || data.reply || "Let's begin.", "question")
      ]);
    } catch (err) {
      setMessages([
        createBotMessage(`Error connecting to server. ${err.message}`, "error")
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    if (active) {
      loadStartNode();
    }

    return () => {
      active = false;
    };
  }, []);

  const sendMessage = async (messageOverride) => {
    const userMessage = (messageOverride ?? input).trim();

    if (!userMessage || loading || conversationState === "result") {
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMessage,
          currentNode
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed.");
      }

      setCurrentNode(data.currentNode || currentNode);
      setCurrentOptions(data.options || []);
      setConversationState(data.status || "question");

      setMessages((prev) => {
        const nextMessages = [...prev];

        if (data.status === "clarification") {
          nextMessages.push(createBotMessage(data.clarification || data.reply, "clarification"));
        } else if (data.status === "result") {
          nextMessages.push(createBotMessage(data.explanation || data.reply, "result"));
        } else {
          nextMessages.push(createBotMessage(data.question || data.reply, "question"));
        }

        return nextMessages;
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        createBotMessage(`Error connecting to server. ${err.message}`, "error")
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
    <div className="chat-shell">
      <div className="chat-box">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat-message ${message.role === "user" ? "user" : "bot"} ${message.kind || "message"}`}
          >
            {message.text}
          </div>
        ))}
      </div>

      {currentOptions.length > 0 && conversationState !== "result" && (
        <div className="chat-options" aria-label="Suggested answers">
          {currentOptions.map((option) => (
            <button
              key={option}
              type="button"
              className="chat-option"
              onClick={() => sendMessage(option)}
              disabled={loading}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {conversationState === "result" && (
        <div className="chat-toolbar">
          <button
            type="button"
            className="chat-reset"
            onClick={loadStartNode}
            disabled={loading}
          >
            Reset chat
          </button>
        </div>
      )}

      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={conversationState === "result" ? "Conversation completed" : "Type your answer..."}
          disabled={loading || conversationState === "result"}
        />
        <button
          type="button"
          className="chat-send"
          onClick={() => sendMessage()}
          disabled={loading || conversationState === "result"}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
