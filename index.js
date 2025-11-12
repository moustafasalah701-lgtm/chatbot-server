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
      return res.status(500).json({ reply: "حدث خطأ داخلي: مفتاح Gemini API مفقود." });
    }

    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "الرسالة مطلوبة ويجب أن تكون نصاً" });
    }

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
        temperature: 0.5,
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
        timeout: 30000, // 30 ثانية timeout
      }
    );

    // استخراج الرد من استجابة Gemini
    const reply =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "لم أتمكن من فهم السؤال أو معالجته.";

    res.json({ reply });

  } catch (err) {
    console.error("❌ Server error contacting Gemini API:", err.response?.data || err.message);

    let errorMessage = "حدث خطأ أثناء الاتصال بالمساعد الزراعي.";

    if (err.response?.status === 400) {
      errorMessage = "طلب غير صالح لـ Gemini API. يرجى التحقق من تنسيق البيانات.";
    } else if (err.response?.status === 403) {
      errorMessage = "تم رفض الوصول إلى Gemini API. تأكد من صحة المفتاح.";
    } else if (err.response?.status === 429) {
      errorMessage = "تم تجاوز حد الاستخدام لـ Gemini API. يرجى المحاولة لاحقاً.";
    } else if (err.code === 'ECONNABORTED') {
      errorMessage = "انتهت مهلة الاتصال بـ Gemini API.";
    }

    res.status(500).json({ reply: errorMessage });
  }
});

// نقطة للتحقق من صحة السيرفر
app.get("/api/health", (req, res) => {
  res.json({
    status: "✅ Server is running",
    geminiConfigured: !!GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// نقطة للتحقق من اتصال Gemini API
app.get("/api/test-gemini", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY missing" });
    }

    const testPayload = {
      contents: [
        {
          parts: [
            { text: "قل مرحباً فقط" }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 10,
      }
    };

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
    res.json({
      success: true,
      message: "✅ Gemini API is working",
      reply
    });

  } catch (error) {
    console.error("❌ Gemini test failed:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: "Gemini API test failed",
      details: error.response?.data || error.message
    });
  }
});

// تصدير التطبيق لـ Vercel
export default app;