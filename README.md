# SME AI Guidance Chatbot

This project is a web-based chatbot application developed as part of the master thesis:

**"Guidelines towards Intelligent SMEs"**

The chatbot is designed to guide small and medium enterprises (SMEs) through AI adoption using a structured, evidence-based framework. The system aims to provide practical guidance while staying transparent, explainable, and aligned with Industry 5.0 principles.

## Project Goal

The application helps SMEs assess barriers to AI adoption and receive actionable next steps. It is built to:

- provide practical, actionable guidance
- remain transparent and explainable
- avoid black-box AI decision-making
- reflect human-centric and trustworthy AI principles

## Core Architecture

This system follows a **hybrid rule-based + AI-enhanced architecture**.

### Source of truth

All decision logic comes from a deterministic decision tree stored in JSON:

- questions
- answer options
- transitions between nodes
- final recommendations

The decision tree is the single source of truth. The AI layer does not create new paths, does not override transitions, and does not modify schema logic.

### Role of AI

AI is used only as an interpreter and explanation layer.

It is responsible for:

1. **Input interpretation**
   Mapping free-text user input to one of the predefined schema options.

2. **Response enhancement**
   Turning schema-based outputs into more natural, conversational explanations without changing their meaning.

3. **Fallback handling**
   Asking clarifying questions when user input cannot be mapped confidently to a valid schema option.

## Current Tech Stack

### Frontend

- React
- Vite
- Chat UI with support for both free text and predefined option buttons
- GitHub Pages deployment

### Backend

- Node.js
- Express
- OpenAI API integration
- Deterministic JSON decision tree

### Deployment

- Frontend: GitHub Pages
- Backend: Render

## Repository Structure

```text
ai-guide-chatbot/
|-- backend/
|   |-- data/
|   |   `-- decisionTree.json
|   |-- services/
|   |   `-- openaiService.js
|   |-- index.js
|   `-- package.json
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- components/
|   |   |   `-- Chat.jsx
|   |   |-- App.jsx
|   |   |-- index.css
|   |   `-- main.jsx
|   `-- package.json
`-- README.md
```

## Chat Flow

The backend `POST /chat` endpoint accepts:

```json
{
  "message": "...",
  "currentNode": "start"
}
```

The flow is:

1. Load the current node from the JSON decision tree
2. Extract the valid options for that node
3. Try to map the user input to one of those options
4. If mapping is uncertain, return a clarification prompt
5. If mapping succeeds, move to the next schema-defined node
6. Return either the next question or a final recommendation

## Local Development

### Backend

Create `backend/.env` with:

```env
PORT=3000
CORS_ORIGIN=http://localhost:5173
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.4-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

Then run the backend from the `backend` directory:

```bash
npm install
npm start
```

### Frontend

Create `frontend/.env.local` with:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Then run the frontend from the `frontend` directory:

```bash
npm install
npm run dev
```

## Production Setup

### Frontend

The production frontend uses:

```env
VITE_API_BASE_URL=https://ai-guide-chatbot-f4b1.onrender.com
```

### Backend

The backend is deployed on Render and should allow the GitHub Pages origin:

```env
CORS_ORIGIN=https://nijaz-k.github.io
```

## Academic Focus

This project is intended to demonstrate:

- explainability
- transparency
- hybrid AI + rule-based system design
- practical usability for SMEs

## Important Design Constraint

AI must never become the decision-maker in this system.

The schema decides the flow.
The AI only helps users interact with that flow more naturally.
