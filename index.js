import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

// استخدام متغير البيئة بشكل صحيح
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(express.json({ limit: "1mb" }));
app.use(cors());

// نقطة الوصول الأساسية لـ chatbot
app.post("/api/chatbot", async (req, res) => {
  try {
    console.log("🔍 Checking GEMINI_API_KEY:", !!GEMINI_API_KEY);

    // التحقق من وجود مفتاح Gemini
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY is missing");
      return res.status(500).json({
        reply: "عذراً، الخادم غير مهيء بشكل صحيح. يرجى التحقق من إعدادات المفتاح."
      });
    }

    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "الرسالة مطلوبة ويجب أن تكون نصاً" });
    }

    console.log("📨 Received message:", message.substring(0, 50) + "...");

    // استخدام Gemini API
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `أنت مساعد ذكي متخصص في الزراعة والبستنة والعناية بالنباتات. أجب فقط عن الأسئلة المتعلقة بالزراعة.

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

    console.log("🔄 Sending to Gemini API...");

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

    console.log("✅ Gemini API response received");

    // استخراج الرد من استجابة Gemini
    const replyText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      console.error("❌ Empty response from Gemini");
      return res.json({ reply: "عذراً، لم أتمكن من معالجة سؤالك. يرجى المحاولة مرة أخرى." });
    }

    console.log("📤 Sending reply to client");
    return res.json({ reply: replyText });

  } catch (err) {
    console.error("❌ Error in chatbot endpoint:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
      code: err.code
    });

    let errorMessage = "عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.";

    if (err.response?.status === 400) {
      errorMessage = "طلب غير صالح. يرجى التحقق من البيانات المرسلة.";
    } else if (err.response?.status === 403) {
      errorMessage = "مشكلة في المصادقة. تأكد من صحة مفتاح API.";
    } else if (err.response?.status === 429) {
      errorMessage = "تم تجاوز حد الاستخدام. يرجى المحاولة لاحقاً.";
    } else if (err.code === 'ECONNABORTED') {
      errorMessage = "انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.";
    }

    return res.status(500).json({ reply: errorMessage });
  }
});

// نقطة للتحقق من صحة السيرفر
app.get("/api/health", (req, res) => {
  return res.json({
    status: "✅ Server is running",
    geminiConfigured: !!GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
    message: GEMINI_API_KEY ? "Gemini API Key is configured" : "Gemini API Key is MISSING - Please add GEMINI_API_KEY to environment variables"
  });
});

// نقطة أساسية للتحقق من أن السيرفر شغال
app.get("/", (req, res) => {
  return res.json({
    message: "🌿 Agricultural Chatbot Server is Running!",
    status: "active",
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET /api/health",
      "POST /api/chatbot"
    ]
  });
});

// معالج للراوتات غير الموجودة
app.use("*", (req, res) => {
  return res.status(404).json({
    error: "Endpoint not found",
    availableEndpoints: [
      "GET /",
      "GET /api/health",
      "POST /api/chatbot"
    ]
  });
});

// معالج الأخطاء العام
app.use((error, req, res, next) => {
  console.error("🚨 Global error handler:", error);
  return res.status(500).json({
    error: "Internal server error",
    message: "Something went wrong on the server"
  });
});

// التصدير للتطبيق
export default app;