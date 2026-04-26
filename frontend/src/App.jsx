import Chat from "./components/Chat";

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="app-kicker">Master Thesis Prototype</p>
        <h1>Guidelines towards Intelligent SMEs</h1>
        <p className="app-subtitle">
          A transparent AI guidance chatbot for structured SME adoption decisions.
        </p>
      </header>

      <Chat />

      <footer className="app-footer">
        <p>Copyright Nijaz Karahmetovic - Master Thesis</p>
      </footer>
    </div>
  );
}

export default App;
