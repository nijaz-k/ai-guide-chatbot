const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function normalizeOptions(options) {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error("Options must be a non-empty array.");
  }

  return options.map((option, index) => {
    if (typeof option === "string" && option.trim()) {
      return option.trim();
    }

    if (option && typeof option.label === "string" && option.label.trim()) {
      return option.label.trim();
    }

    throw new Error(`Invalid option at index ${index}. Expected a string or an object with a label.`);
  });
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    return "";
  }

  const parts = [];

  for (const item of payload.output) {
    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const contentPart of item.content) {
      if (contentPart.type === "output_text" && typeof contentPart.text === "string") {
        parts.push(contentPart.text);
      }
    }
  }

  return parts.join("").trim();
}

function extractRefusal(payload) {
  if (!Array.isArray(payload.output)) {
    return null;
  }

  for (const item of payload.output) {
    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const contentPart of item.content) {
      if (contentPart.type === "refusal" && typeof contentPart.refusal === "string") {
        return contentPart.refusal;
      }
    }
  }

  return null;
}

export class OpenAIService {
  constructor({
    apiKey = process.env.OPENAI_API_KEY,
    model = DEFAULT_MODEL,
    baseUrl = DEFAULT_BASE_URL,
    fetchImpl = globalThis.fetch
  } = {}) {
    if (!fetchImpl) {
      throw new Error("Fetch is not available in this runtime.");
    }

    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetch = fetchImpl;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new Error("OPENAI_API_KEY is missing. Add it to the backend environment before calling the OpenAI service.");
    }
  }

  async classifyUserInput(userInput, options) {
    const normalizedOptions = normalizeOptions(options);

    const result = await this.requestStructuredResponse({
      schemaName: "input_classification",
      developerMessage: [
        "You map SME user input to one of the predefined answer options from a deterministic decision tree.",
        "You are not allowed to invent new options, reinterpret the schema, or add new logic.",
        "Return only one exact option label from the allowed list, or return uncertain if the match is weak or ambiguous."
      ].join(" "),
      userMessage: [
        `User input: ${userInput}`,
        `Allowed options: ${JSON.stringify(normalizedOptions)}`
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          match: {
            type: "string",
            enum: [...normalizedOptions, "uncertain"]
          }
        },
        required: ["match"],
        additionalProperties: false
      }
    });

    return result.match;
  }

  async generateExplanation(schemaText, context = {}) {
    const serializedContext = JSON.stringify(context);

    const result = await this.requestStructuredResponse({
      schemaName: "schema_explanation",
      developerMessage: [
        "You rewrite decision-tree guidance for SME users in natural language.",
        "Preserve the exact meaning of the source text.",
        "Do not add recommendations, branches, assumptions, or facts that are not already present in the source material.",
        "Keep the explanation practical, clear, and concise."
      ].join(" "),
      userMessage: [
        `Source guidance: ${schemaText}`,
        `Optional context: ${serializedContext}`
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          explanation: {
            type: "string"
          }
        },
        required: ["explanation"],
        additionalProperties: false
      }
    });

    return result.explanation;
  }

  async generateClarification({ question, options, userInput }) {
    const normalizedOptions = normalizeOptions(options);

    const result = await this.requestStructuredResponse({
      schemaName: "clarification_message",
      developerMessage: [
        "You generate a clarification question that guides the user back to the allowed answer options.",
        "Do not decide the answer for them.",
        "Mention the original decision-tree question in plain language.",
        "Keep the message friendly and brief."
      ].join(" "),
      userMessage: [
        `Original question: ${question}`,
        `Allowed options: ${JSON.stringify(normalizedOptions)}`,
        `User input that could not be classified confidently: ${userInput}`
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          clarification: {
            type: "string"
          }
        },
        required: ["clarification"],
        additionalProperties: false
      }
    });

    return result.clarification;
  }

  async requestStructuredResponse({ schemaName, developerMessage, userMessage, schema }) {
    this.assertConfigured();

    const response = await this.fetch(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          {
            role: "developer",
            content: developerMessage
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema
          }
        }
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.error?.message || "OpenAI request failed.";
      throw new Error(message);
    }

    const refusal = extractRefusal(payload);

    if (refusal) {
      throw new Error(`OpenAI refused the request: ${refusal}`);
    }

    const text = extractOutputText(payload);

    if (!text) {
      throw new Error("OpenAI returned an empty response.");
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`OpenAI returned invalid JSON: ${error.message}`);
    }
  }
}

export function createOpenAIService(overrides) {
  return new OpenAIService(overrides);
}

export const openAIService = new OpenAIService();
