import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
// استخدام متغير Gemini بدلاً من OpenAI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(express.json({ limit: "1mb" }));
app.use(cors());

// نقطة الوصول الأساسية لـ chatbot
app.post("/api/chatbot", async (req, res) => {
  try {
    // التحقق من وجود مفتاح Gemini في بيئة Vercel
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY is missing in Vercel Environment Variables.");
      return res.status(500).json({
        reply: "حدث خطأ داخلي: مفتاح Gemini API مفقود. تأكد من إضافة GEMINI_API_KEY في إعدادات Vercel."
      });
    }

    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "الرسالة مطلوبة ويجب أن تكون نصاً" });
    }

    console.log("📨 Received message:", message);

    // 🔄 استخدام Gemini API بدلاً من OpenAI
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
        topP: 0.8,
        topK: 40
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
        timeout: 30000, // 30 ثانية timeout
      }
    );

    console.log("✅ Gemini API response received");

    // استخراج الرد من استجابة Gemini
    const replyText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      console.error("❌ Empty response from Gemini:", response.data);
      throw new Error("رد Gemini فارغ");
    }

    const reply = replyText || "لم أتمكن من فهم السؤال أو معالجته.";

    console.log("📤 Sending reply to client");
    res.json({ reply });

  } catch (err) {
    console.error("❌ Server error contacting Gemini API:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
      code: err.code
    });

    let errorMessage = "حدث خطأ أثناء الاتصال بالمساعد الزراعي.";

    if (err.response?.status === 400) {
      errorMessage = "طلب غير صالح لـ Gemini API. يرجى التحقق من تنسيق البيانات.";
    } else if (err.response?.status === 403) {
      errorMessage = "تم رفض الوصول إلى Gemini API. تأكد من صحة المفتاح وتفعيله.";
    } else if (err.response?.status === 429) {
      errorMessage = "تم تجاوز حد الاستخدام لـ Gemini API. يرجى المحاولة لاحقاً.";
    } else if (err.code === 'ECONNABORTED') {
      errorMessage = "انتهت مهلة الاتصال بـ Gemini API.";
    } else if (err.message?.includes('Gemini')) {
      errorMessage = "مشكلة في اتصال Gemini API. تأكد من المفتاح.";
    }

    res.status(500).json({ reply: errorMessage });
  }
});

// نقطة للتحقق من صحة السيرفر
app.get("/api/health", (req, res) => {
  res.json({
    status: "✅ Server is running",
    geminiConfigured: !!GEMINI_API_KEY,
    message: GEMINI_API_KEY ? "Gemini API Key is configured" : "Gemini API Key is MISSING",
    timestamp: new Date().toISOString()
  });
});

// نقطة للتحقق من اتصال Gemini API
app.get("/api/test-gemini", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY missing",
        message: "Please add GEMINI_API_KEY to Vercel environment variables"
      });
    }

    const testPayload = {
      contents: [
        {
          parts: [
            { text: "قل مرحباً فقط بكلمة واحدة" }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 10,
      }
    };

    console.log("🧪 Testing Gemini API connection...");

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      testPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("✅ Gemini test successful:", reply);

    res.json({
      success: true,
      message: "✅ Gemini API is working correctly",
      reply,
      model: "gemini-pro"
    });

  } catch (error) {
    console.error("❌ Gemini test failed:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    res.status(500).json({
      success: false,
      error: "Gemini API test failed",
      message: error.message,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

// نقطة أساسية للتحقق من أن السيرفر شغال
app.get("/", (req, res) => {
  res.json({
    message: "🌿 Agricultural Chatbot Server is Running!",
    endpoints: {
      health: "/api/health",
      test: "/api/test-gemini",
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
      "GET /api/test-gemini",
      "POST /api/chatbot"
    ]
  });
});

// تصدير التطبيق لـ Vercel
export default app;