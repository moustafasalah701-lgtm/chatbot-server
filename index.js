import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_KEY) {
  console.error("❌ Missing OPENAI_API_KEY in .env file");
  process.exit(1);
}

app.use(express.json({ limit: "1mb" }));
app.use(cors());

// ✅ الـ Route الأساسي
app.post("/api/chatbot", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "أنت مساعد ذكي متخصص في الزراعة والبستنة والعناية بالنباتات. أجب فقط عن الأسئلة المتعلقة بالري، التربة، التسميد، الأمراض الزراعية ومواسم الزراعة. كن موجزًا وعمليًا.",
        },
        { role: "user", content: message },
      ],
      temperature: 0.5,
      max_tokens: 800,
    };

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
      }
    );

    const reply =
      response.data?.choices?.[0]?.message?.content ||
      "لم أتمكن من فهم السؤال.";

    res.json({ reply });
  } catch (err) {
    console.error("❌ Server error contacting OpenAI:", err.message);
    res
      .status(500)
      .json({ reply: "حدث خطأ أثناء الاتصال بالمساعد الزراعي." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Chatbot server running on http://localhost:${PORT}`);
});
