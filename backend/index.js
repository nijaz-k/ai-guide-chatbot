import "dotenv/config";
import express from "express";
import cors from "cors";
import decisionTree from "./data/decisionTree.json" with { type: "json" };
import { openAIService } from "./services/openaiService.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    }
  })
);
app.use(express.json());

function getNode(nodeId) {
  return decisionTree[nodeId];
}

function getQuestionPayload(node, extras = {}) {
  return {
    status: "question",
    currentNode: node.id,
    question: node.question,
    options: node.options.map((option) => option.label),
    ...extras
  };
}

function getDirectOptionMatch(message, options) {
  if (typeof message !== "string") {
    return null;
  }

  const normalizedMessage = message.trim().toLowerCase();

  if (!normalizedMessage) {
    return null;
  }

  return options.find((option) => option.label.trim().toLowerCase() === normalizedMessage) || null;
}

async function resolveOption(message, node) {
  const directMatch = getDirectOptionMatch(message, node.options);

  if (directMatch) {
    return directMatch;
  }

  const classifiedLabel = await openAIService.classifyUserInput(message, node.options);

  if (classifiedLabel === "uncertain") {
    return null;
  }

  return node.options.find((option) => option.label === classifiedLabel) || null;
}

async function buildResultPayload(resultText, currentNode, selectedOption) {
  const explanation = await openAIService.generateExplanation(resultText, {
    currentNode,
    selectedOption
  });

  return {
    status: "result",
    currentNode,
    selectedOption,
    result: resultText,
    explanation,
    reply: explanation
  };
}

app.get("/chat", (req, res) => {
  const startNode = getNode("start");

  res.json(getQuestionPayload(startNode));
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "sme-ai-guidance-backend"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

app.post("/chat", async (req, res) => {
  const { message, currentNode = "start" } = req.body ?? {};
  const node = getNode(currentNode);

  if (!node) {
    return res.status(400).json({
      error: `Unknown currentNode: ${currentNode}`
    });
  }

  if (node.type !== "question") {
    return res.status(400).json({
      error: `Node ${currentNode} is not a question node.`
    });
  }

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "A non-empty message is required.",
      ...getQuestionPayload(node)
    });
  }

  try {
    const matchedOption = await resolveOption(message, node);

    if (!matchedOption) {
      const clarification = await openAIService.generateClarification({
        question: node.question,
        options: node.options,
        userInput: message
      });

      return res.json(
        getQuestionPayload(node, {
          status: "clarification",
          clarification,
          reply: clarification
        })
      );
    }

    if (matchedOption.result) {
      return res.json(await buildResultPayload(matchedOption.result, currentNode, matchedOption.label));
    }

    const nextNode = getNode(matchedOption.next);

    if (!nextNode) {
      return res.status(500).json({
        error: `Decision tree is missing next node: ${matchedOption.next}`
      });
    }

    if (nextNode.type === "result") {
      return res.json(await buildResultPayload(nextNode.result, nextNode.id, matchedOption.label));
    }

    return res.json(
      getQuestionPayload(nextNode, {
        selectedOption: matchedOption.label,
        reply: nextNode.question
      })
    );
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to process chat request."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
