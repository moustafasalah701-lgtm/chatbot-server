import express from "express";
import axios from "axios";
import cors from "cors";

// Vercel يتعامل مع المتغيرات البيئية مباشرة، لذلك لا حاجة لمكتبة dotenv هنا.

const app = express();
// يتم قراءة المتغير من بيئة Vercel
const OPENAI_KEY = process.env.OPENAI_API_KEY;

app.use(express.json({ limit: "1mb" }));
app.use(cors());

// نقطة الوصول الأساسية لـ chatbot
app.post("/api/chatbot", async (req, res) => {
  try {
    // التحقق من وجود المفتاح في بيئة Vercel
    if (!OPENAI_KEY) {
      console.error("❌ OPENAI_API_KEY is missing in Vercel Environment Variables.");
      return res.status(500).json({ reply: "حدث خطأ داخلي: المفتاح السري لـ API مفقود." });
    }

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
    // يجب تسجيل الخطأ كاملاً للتحقق منه في Runtime Logs على Vercel
    console.error("❌ Server error contacting OpenAI:", err);
    res
      .status(500)
      .json({ reply: "حدث خطأ أثناء الاتصال بالمساعد الزراعي." });
  }
});

// 🛑 النقطة الحاسمة لـ Vercel: يجب تصدير التطبيق بدلاً من الاستماع للمنفذ
export default app;
// أو يمكنك استخدام module.exports = app; إذا كنت تستخدم صيغة require/module