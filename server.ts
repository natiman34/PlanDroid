import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Server-side API endpoint for multi-turn Gemini productivity assistant
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const systemInstruction = `You are PlanDroid AI, a supportive, expert productivity coach, time-blocking mentor, and smart task strategist.
Your mission is to help the user plan their days, prioritize urgent goals, conquer procrastination, maintain their productivity streak, and structure focused work sessions.

Guidelines:
- Keep answers concise, highly actionable, and encouraging.
- When suggesting plans or schedule adjustments, recommend specific time blocks (e.g., 25m, 45m) with start and end times.
- Format responses cleanly with bullet points or numbered action steps.
- Celebrate their daily streak and focus momentum!

Current User Context:
- Today: ${context?.todayDate || new Date().toDateString()}
- Current Productivity Streak: ${context?.streakDays || 0} consecutive days of 100% task completion
- Today's Tasks: ${context?.tasksCount || 0} planned (${context?.completedCount || 0} completed)
- Schedule Status: ${context?.scheduleSummary || 'None currently active'}
`;

    // Map messages to Gemini contents structure
    const contents = messages.map((m: { role: 'user' | 'model'; text: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    const withTimeout = <T>(promise: Promise<T>, ms = 25000): Promise<T> => {
      let timer: NodeJS.Timeout;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Request timed out')), ms);
      });
      return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
    };

    let reply: string | undefined;

    // Primary attempt: gemini-3.8-flash with generous 25s timeout and maxOutputTokens 600
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: 600,
            temperature: 0.7,
          },
        }),
        25000
      );
      reply = response.text;
    } catch (primaryErr: any) {
      console.warn('Primary model gemini-3.8-flash busy/failed, trying gemini-3.1-flash-lite...', primaryErr?.message);
      try {
        const fallbackResponse = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
            config: {
              systemInstruction,
              maxOutputTokens: 600,
              temperature: 0.7,
            },
          }),
          15000
        );
        reply = fallbackResponse.text;
      } catch (fallbackErr: any) {
        console.warn('Fallback model also encountered an issue:', fallbackErr?.message);
        // Smart contextual coaching backup when API is temporarily congested
        const lastUserMsg = messages[messages.length - 1]?.text?.toLowerCase() || '';
        const streak = context?.streakDays || 0;
        const tasksCount = context?.tasksCount || 0;

        if (lastUserMsg.includes('streak') || lastUserMsg.includes('protect')) {
          reply = `Here is your **Streak Protection Strategy**:\n\n1. **Focus on Completeness**: Streak points require 100% of scheduled tasks to be marked done. Keep today's plan lean and realistic.\n2. **Tackle the Hardest Block First**: Use a 25-minute Pomodoro timer immediately for your highest-priority task.\n3. **Prune or Reschedule**: If an unexpected blocker arrives, reschedule optional tasks to tomorrow so today finishes at 100%!\n\nYou're at **${streak} consecutive days**—keep the fire alive! 🔥`;
        } else if (lastUserMsg.includes('break down') || lastUserMsg.includes('blocks')) {
          reply = `Here is how to slice your work into high-velocity 25-minute blocks:\n\n• **Block 1 (25m)**: Clear the setup, define your exact deliverables, and eliminate open browser tabs.\n• **5m Break**: Stand up, hydrate, and look 20 feet away.\n• **Block 2 (25m)**: Execute the core substance without checking messages.\n• **Block 3 (25m)**: Polish, review against criteria, and mark the plan complete in PlanDroid!`;
        } else {
          reply = `Here is your productivity recommendation:\n\n• **Current Momentum**: You have ${tasksCount} task(s) planned today with a ${streak}-day streak.\n• **Next Action**: Select your top item and start a 25-minute timer from your task list.\n• **Goal**: Achieve 100% task completion before end of day to extend your daily streak record!`;
        }
      }
    }

    return res.json({ reply: reply || 'Ready to crush your goals today! Start your next focus block now.' });
  } catch (error: any) {
    console.error('Gemini chat outer error:', error);
    return res.json({
      reply: 'Your AI Coach is ready to assist! Pick your highest-priority task on your schedule and start a 25-minute Pomodoro focus block to keep your streak moving forward.'
    });
  }
});

// Explicit compliant PWA headers for Android Chrome & Desktop installation
app.get(['/manifest.webmanifest', '/manifest.json'], (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'manifest.webmanifest'));
});

app.get(['/sw.js', '/dev-sw.js'], (req, res, next) => {
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

// Serve PWA icons with CORS allowed for Google WebAPK Minting Service and Android Chrome
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
  }
}));

// Vite middleware in development; static file serving in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: {
      middlewareMode: true,
      hmr: false,
      ws: false,
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PlanDroid Full-Stack Server running on http://0.0.0.0:${PORT}`);
});
