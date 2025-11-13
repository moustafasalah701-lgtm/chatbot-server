import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(express.json({ limit: "1mb" }));
app.use(cors());

// ✅ جميع الـ routes تبدأ من /api
app.post("/api/chatbot", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        reply: "عذراً، الخادم غير مهيء. تأكد من إضافة GEMINI_API_KEY."
      });
    }

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        reply: "يرجى إرسال رسالة."
      });
    }

    console.log("📨 Received:", message);

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `أنت مساعد زراعي ذكي. أجب على الأسئلة الزراعية فقط.

السؤال: ${message}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      payload,
      {
        timeout: 15000,
      }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "عذراً، لم أتمكن من الإجابة.";

    res.json({ reply });

  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({
      reply: "حدث خطأ في الخادم. يرجى المحاولة لاحقاً."
    });
  }
});

// ✅ health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "✅ متصل",
    gemini: !!GEMINI_API_KEY,
    time: new Date().toISOString()
  });
});

// ✅ رابط أساسي
app.get("/", (req, res) => {
  res.json({
    message: "🌿 Agricultural Chatbot API",
    endpoints: [
      "GET  /api/health",
      "POST /api/chatbot"
    ]
  });
});

// ✅ معالج للراوتات الخاطئة
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint غير موجود",
    correctEndpoints: [
      "https://your-app.vercel.app/api/health",
      "https://your-app.vercel.app/api/chatbot"
    ]
  });
});

export default app;