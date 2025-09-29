import { promises as fs } from 'fs';
import path from 'path';

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
    await fs.writeFile(storagePath, '{\n  "nodes": [],\n  "edges": []\n}', 'utf8');
  }
};

const loadGraph = async (storagePath) => {
  try {
    const content = await fs.readFile(storagePath, 'utf8');
    if (!content.trim()) {
      return { nodes: [], edges: [] };
    }
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { nodes: [], edges: [] };
    }
    throw error;
  }
};

const writeGraph = async (storagePath, data) => {
  await fs.writeFile(storagePath, JSON.stringify(data, null, 2), 'utf8');
};

export const graphStorageApiPlugin = () => {
  const storagePath = path.resolve(process.cwd(), 'src/data/defaultGraphTemplate.json');

  return {
    name: 'graph-storage-api',
    configureServer(server) {
      server.middlewares.use('/api/graph', (req, res, next) => {
        const handler = async () => {
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          await ensureStorageFile(storagePath);

          if (req.method === 'GET') {
            const data = await loadGraph(storagePath);
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
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
              return;
            }
            if (!payload.nodes || !payload.edges) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Payload must include nodes and edges fields' }));
              return;
            }
            await writeGraph(storagePath, payload);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }

          next();
        };

        handler().catch((error) => {
          console.error('Graph storage API error', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        });
      });
    }
  };
};
