import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { graphStorageApiPlugin } from './server/graphStorageApiPlugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readRequestBody = (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => resolve(body));
  req.on('error', reject);
});

const ensureStorageFile = async (storagePath) => {
  try {
    await fs.access(storagePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    await fs.writeFile(storagePath, '{}', 'utf8');
  }
};

const loadScreens = async (storagePath) => {
  try {
    const content = await fs.readFile(storagePath, 'utf8');
    if (!content.trim()) {
      return {};
    }
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
};

const writeScreens = async (storagePath, data) => {
  await fs.writeFile(storagePath, JSON.stringify(data, null, 2), 'utf8');
};

const screenStorageApiPlugin = () => {
  const storagePath = path.resolve(__dirname, 'src/data/screens.json');

  return {
    name: 'screen-storage-api',
    configureServer(server) {
      server.middlewares.use('/api/screens', (req, res, next) => {
        const handler = async () => {
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          await ensureStorageFile(storagePath);

          if (req.method === 'GET') {
            const data = await loadScreens(storagePath);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return;
          }

          if (req.method === 'POST') {
            const rawBody = await readRequestBody(req);
            let payload;
            try {
              payload = rawBody ? JSON.parse(rawBody) : {};
            } catch (parseError) {
              console.warn('Invalid screen payload received', parseError);
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
              return;
            }

            const { id, screen } = payload || {};
            if (!id || !screen) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Payload must include id and screen fields' }));
              return;
            }

            const data = await loadScreens(storagePath);
            data[id] = screen;
            await writeScreens(storagePath, data);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }

          next();
        };

        handler().catch((error) => {
          console.error('Screen storage API error', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        });
      });
    }
  };
};

const sandboxApiProxyTarget = process.env.SANDBOX_API_PROXY?.trim() || 'http://localhost:5050';
const isProxyEnabled = sandboxApiProxyTarget !== 'off';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения из .env файлов
  const env = loadEnv(mode, process.cwd(), '');
  
  // Определяем базовый путь
  // Development: '/' (из .env.development)
  // Production: '/admin/panel' (из .env.production)
  const basePath = env.VITE_BASE_PATH || '/';
  
  console.log(`🔧 [Vite] Building in ${mode} mode with base path: ${basePath}`);
  
  return {
  plugins: [react(), screenStorageApiPlugin(), graphStorageApiPlugin()],
  base: basePath,
  server: isProxyEnabled
    ? {
        proxy: {
          '/api/start': {
            target: sandboxApiProxyTarget,
            changeOrigin: true
          },
          '/api/action': {
            target: sandboxApiProxyTarget,
            changeOrigin: true
          }
        }
      }
    : undefined
  };
});
