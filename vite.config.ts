import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite plugin that serves Vercel-style API routes locally during dev.
 * This lets `npm run dev` work without needing `vercel dev`.
 */
function vercelApiDev(env: Record<string, string>): Plugin {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/gemini-live-token', async (req, res) => {
        // Inject env vars so the handler can read them via process.env
        const envKeys = [
          'GOOGLE_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_AI_STUDIO_API_KEY', 'GEMINI_LIVE_MODEL'
        ];
        for (const key of envKeys) {
          if (env[key] && !process.env[key]) process.env[key] = env[key];
        }

        try {
          const mod = await server.ssrLoadModule('/api/gemini-live-token.ts');
          const handler = mod.default;

          // Adapt Node http.IncomingMessage to minimal VercelRequest shape
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = Buffer.concat(chunks).toString();

          const fakeReq = {
            method: req.method,
            headers: req.headers,
            body: body ? JSON.parse(body) : {}
          };

          const headerMap: Record<string, string> = {};
          let statusCode = 200;
          const fakeRes = {
            status(code: number) { statusCode = code; return fakeRes; },
            setHeader(k: string, v: string) { headerMap[k] = v; return fakeRes; },
            json(data: unknown) {
              res.writeHead(statusCode, { 'Content-Type': 'application/json', ...headerMap });
              res.end(JSON.stringify(data));
              return fakeRes;
            },
            end() {
              res.writeHead(statusCode, headerMap);
              res.end();
              return fakeRes;
            }
          };

          await handler(fakeReq, fakeRes);
        } catch (err) {
          console.error('[vite-api-dev] error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Dev API handler error', message: String(err) }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), vercelApiDev(env)],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
