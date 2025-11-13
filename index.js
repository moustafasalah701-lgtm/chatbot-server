import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Middleware أساسي
app.use(express.json());
app.use(cors());

// Route أساسي للتحقق
app.get("/", (req, res) => {
  res.json({
    message: "🌿 Agricultural Chatbot API is Running!",
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "✅ Server is healthy",
    geminiConfigured: !!GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Chatbot endpoint
app.post("/chatbot", async (req, res) => {
  try {
    console.log("🔍 Checking GEMINI_API_KEY...");

    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY is missing");
      return res.status(500).json({
        reply: "عذراً، الخادم غير مهيء. يرجى التحقق من إعدادات المفتاح."
      });
    }

    const { message } = req.body;
    console.log("📨 Received message:", message);

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        reply: "يرجى إرسال رسالة نصية صحيحة."
      });
    }

    // طلب Gemini API
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `أنت مساعد زراعي. أجب على سؤال الزراعة التالي: ${message}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
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
        timeout: 10000,
      }
    );

    console.log("✅ Received response from Gemini");

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "عذراً، لم أتمكن من معالجة سؤالك.";

    res.json({ reply });

  } catch (error) {
    console.error("❌ Error details:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    let errorMessage = "عذراً، حدث خطأ أثناء المعالجة.";

    if (error.response?.status === 403) {
      errorMessage = "مشكلة في مصادقة API. تأكد من صحة المفتاح.";
    } else if (error.response?.status === 429) {
      errorMessage = "تم تجاوز حد الاستخدام. يرجى المحاولة لاحقاً.";
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = "انتهت مهلة الاتصال.";
    }

    res.status(500).json({ reply: errorMessage });
  }
});

// معالج الأخطاء
app.use((error, req, res, next) => {
  console.error("🚨 Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: "Something went wrong"
  });
});

export default app;