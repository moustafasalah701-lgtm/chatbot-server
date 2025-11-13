import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(express.json({ limit: "1mb" }));
app.use(cors());

app.post("/api/chatbot", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY is missing");
      return res.status(500).json({
        reply: "عذراً، الخادم غير مهيء بشكل صحيح. يرجى التحقق من إعدادات المفتاح."
      });
    }

    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        reply: "يرجى إرسال رسالة نصية صحيحة."
      });
    }

    console.log("📨 Received message:", message);

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `أنت مساعد ذكي متخصص في الزراعة والبستنة والعناية بالنباتات. أجب فقط عن الأسئلة المتعلقة بالري، التربة، التسميد، الأمراض الزراعية ومواسم الزراعة. كن موجزًا وعمليًا.

السؤال: ${message}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const replyText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      throw new Error("رد Gemini فارغ");
    }

    res.json({ reply: replyText });

  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);

    let errorMessage = "عذراً، حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى.";

    if (err.response?.status === 400) {
      errorMessage = "طلب غير صالح. يرجى التحقق من البيانات.";
    } else if (err.response?.status === 403) {
      errorMessage = "مشكلة في المصادقة. تأكد من صحة المفتاح.";
    } else if (err.response?.status === 429) {
      errorMessage = "تم تجاوز حد الاستخدام. يرجى المحاولة لاحقاً.";
    } else if (err.code === 'ECONNABORTED') {
      errorMessage = "انتهت مهلة الاتصال.";
    }

    res.status(500).json({ reply: errorMessage });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "✅ Server is running",
    geminiConfigured: !!GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
    message: GEMINI_API_KEY ? "Gemini API Key is configured" : "Gemini API Key is MISSING"
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "🌿 Agricultural Chatbot Server is Running!",
    endpoints: {
      health: "/api/health",
      chatbot: "/api/chatbot (POST)"
    },
    timestamp: new Date().toISOString()
  });
});

// معالج للراوتات غير الموجودة
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    availableEndpoints: [
      "GET /",
      "GET /api/health",
      "POST /api/chatbot"
    ]
  });
});

export default app;