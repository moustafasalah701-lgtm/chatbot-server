import express from 'express';
import cors from 'cors';

const app = express();

// 🔥 CORS - الطريقة الصحيحة
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: false
}));

// Middleware
app.use(express.json());

// 🔥 Handle preflight requests
app.options('*', cors());

// تحقق من أن السيرفر شغال
app.get('/', (req, res) => {
  res.json({
    message: '🌿 Agricultural Chatbot Server is Running!',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// تحقق من صحة السيرفر
app.get('/api/health', (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  res.json({
    status: '✅ Server is healthy',
    geminiConfigured: !!geminiKey,
    timestamp: new Date().toISOString()
  });
});

// نقطة الشات بوت الأساسية
app.post('/api/chatbot', async (req, res) => {
  try {
    console.log('📨 Received request:', req.body);

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.log('❌ GEMINI_API_KEY is missing');
      return res.status(500).json({
        reply: 'عذراً، الخادم غير مهيء بشكل صحيح. يرجى التحقق من إعدادات المفتاح.'
      });
    }

    console.log('📤 Sending to Gemini...');

    // إرسال طلب بسيط إلى Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `أنت مساعد زراعي ذكي متخصص في الزراعة والري والتسميد والتربة والنباتات. أجب على السؤال التالي بطريقة مفيدة ودقيقة:

السؤال: ${message}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Gemini Response received');

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || 'عذراً، لم أتمكن من معالجة سؤالك. يرجى المحاولة مرة أخرى.';

    res.json({ reply });

  } catch (error) {
    console.error('❌ Error:', error.message);

    let errorMessage = 'عذراً، حدث خطأ أثناء معالجة طلبك.';

    if (error.message.includes('401') || error.message.includes('403')) {
      errorMessage = 'مشكلة في مصادقة API. تأكد من صحة المفتاح.';
    } else if (error.message.includes('429')) {
      errorMessage = 'تم تجاوز حد الاستخدام. يرجى المحاولة لاحقاً.';
    } else if (error.message.includes('fetch')) {
      errorMessage = 'مشكلة في الاتصال بالخادم. تأكد من اتصال الإنترنت.';
    }

    res.status(500).json({ reply: errorMessage });
  }
});

// معالج للراوتات غير الموجودة
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// معالج الأخطاء
app.use((error, req, res, next) => {
  console.error('🚨 Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Export for Vercel serverless
export default app;

// For local development
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🌱 Server running on port ${PORT}`);
  });
}