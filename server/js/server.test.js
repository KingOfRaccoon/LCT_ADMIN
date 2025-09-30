import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startServer } from './server.js';

const waitForServer = (instance) => new Promise((resolve, reject) => {
  const onError = (err) => {
    instance.off('listening', onListening);
    reject(err);
  };
  const onListening = () => {
    instance.off('error', onError);
    resolve();
  };
  instance.once('listening', onListening);
  instance.once('error', onError);
});

const closeServer = (instance) => new Promise((resolve, reject) => {
  instance.close((err) => {
    if (err) {
      reject(err);
      return;
    }
    resolve();
  });
});

const findComponentById = (screen, componentId) => {
  if (!screen || typeof screen !== 'object' || !componentId) {
    return null;
  }

  const visited = new Set();
  const stack = [];

  if (Array.isArray(screen.components)) {
    stack.push(...screen.components);
  }

  if (screen.sections && typeof screen.sections === 'object') {
    stack.push(...Object.values(screen.sections));
  }

  while (stack.length > 0) {
    const component = stack.pop();
    if (!component || typeof component !== 'object' || visited.has(component)) {
      continue;
    }
    visited.add(component);

    if (component.id === componentId) {
      return component;
    }

    const children = Array.isArray(component.children) ? component.children : [];
    children.forEach((child) => {
      if (child && typeof child === 'object') {
        stack.push(child);
        return;
      }
      if (typeof child === 'string' && Array.isArray(screen.components)) {
        const referenced = screen.components.find((item) => item && item.id === child);
        if (referenced) {
          stack.push(referenced);
        }
      }
    });
  }

  return null;
};

describe('sandbox js server', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = startServer(0);
    await waitForServer(server);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) {
      await closeServer(server);
      server = undefined;
    }
  });

  const request = async (path) => {
    const response = await fetch(`${baseUrl}${path}`);
    const body = await response.json();
    return { response, body };
  };

  it('returns checkout screen and context on /api/start/', async () => {
    const { response, body } = await request('/api/start/');
    assert.equal(response.status, 200);
    assert.ok(body);
  assert.equal(body?.screen?.id, 'screen-cuhn04-1758927807107');
    assert.equal(body?.context?.state?.status, 'draft');

  const submitButton = findComponentById(body?.screen, 'button-3yqrdr-1758927807107');
  assert.ok(submitButton, 'submit button exists');
  assert.equal(submitButton?.properties?.event ?? submitButton?.props?.event ?? submitButton?.event, 'pay');

  const cancelButton = findComponentById(body?.screen, 'button-krym27-1758927807107');
  assert.ok(cancelButton, 'cancel button exists');
  assert.equal(cancelButton?.properties?.event ?? cancelButton?.props?.event ?? cancelButton?.event, 'cancel');
  });

  it('handles pay event and returns success screen', async () => {
    const params = new URLSearchParams({
      event: 'pay',
      email: 'buyer@example.com',
      promo: 'SALE10'
    });
    const { response, body } = await request(`/api/action?${params.toString()}`);
    assert.equal(response.status, 200);
  assert.equal(body?.screen?.id, 'screen-success-1758927807107');
    assert.equal(body?.context?.state?.status, 'paid');
    assert.equal(body?.context?.inputs?.email, 'buyer@example.com');
    assert.ok(
      Array.isArray(body?.context?.state?.details)
        && body.context.state.details.some((line) => line.includes('промокод') || line.includes('SALE10')),
      'details include promo mention'
    );
  });

  it('handles cancel event and returns cancelled screen', async () => {
    const params = new URLSearchParams({
      event: 'cancel',
      email: 'client@example.com'
    });
    const { response, body } = await request(`/api/action?${params.toString()}`);
    assert.equal(response.status, 200);
  assert.equal(body?.screen?.id, 'screen-cancelled-1758927807107');
    assert.equal(body?.context?.state?.status, 'cancelled');
    assert.equal(body?.context?.inputs?.email, 'client@example.com');
    assert.ok(
      Array.isArray(body?.context?.state?.details)
        && body.context.state.details.some((line) => line.includes('email клиента')),
      'details include email mention'
    );
  });
});
