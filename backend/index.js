import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/chat", (req, res) => {
  const { message } = req.body;

  // placeholder logic
  res.json({
    reply: "AI will process this later: " + message
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});