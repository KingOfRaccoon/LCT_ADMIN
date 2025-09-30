import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

process.env.SANDBOX_FETCH_DISABLED = '1';

const { startServer } = await import('./server.js');

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

  it('возвращает экран ввода email на /api/start/', async () => {
    const { response, body } = await request('/api/start/');
    assert.equal(response.status, 200);
    assert.ok(body);
    assert.equal(body?.screen?.id, 'screen-email-entry');
    assert.equal(body?.context?.state?.status, 'idle');
    assert.equal(body?.context?.state?.title, 'Ввод email');
    assert.equal(body?.context?.state?.message, 'Укажите адрес электронной почты и нажмите кнопку проверки.');
    assert.deepEqual(body?.context?.data?.external?.prefetch, {
      title: 'Совет перед проверкой',
      description: 'Убедитесь, что адрес содержит @ и домен, прежде чем продолжить.'
    });

    const emailInput = findComponentById(body?.screen, 'input-email');
    assert.ok(emailInput, 'email input exists');
    assert.equal(emailInput?.properties?.name, 'email');

    const submitButton = findComponentById(body?.screen, 'button-check-email');
    assert.ok(submitButton, 'submit button exists');
    assert.equal(submitButton?.properties?.event ?? submitButton?.props?.event ?? submitButton?.event, 'checkEmail');

    const prefetchColumn = findComponentById(body?.screen, 'column-entry-prefetch');
    assert.ok(prefetchColumn, 'prefetch column exists');
    const prefetchTitle = findComponentById(body?.screen, 'text-entry-prefetch-title');
    assert.ok(prefetchTitle, 'prefetch title exists');
    assert.equal(prefetchTitle?.properties?.content?.value ?? prefetchTitle?.properties?.content, 'Совет перед проверкой');
  });

  it('обрабатывает событие checkEmail и возвращает экран успеха', async () => {
    const params = new URLSearchParams({
      event: 'checkEmail',
      email: 'user@example.com'
    });
    const { response, body } = await request(`/api/action?${params.toString()}`);
    assert.equal(response.status, 200);
    assert.equal(body?.screen?.id, 'screen-email-valid');
    assert.equal(body?.context?.state?.status, 'success');
    assert.equal(body?.context?.state?.message, 'Адрес выглядит корректно');
    assert.equal(body?.context?.inputs?.email, 'user@example.com');
    assert.deepEqual(body?.context?.data?.external?.prefetch, {
      title: 'Совет перед проверкой',
      description: 'Убедитесь, что адрес содержит @ и домен, прежде чем продолжить.'
    });
    assert.deepEqual(body?.context?.data?.external?.success, {
      title: 'Совет по дальнейшим шагам',
      description: 'Используйте подтверждённый email, чтобы отправить приветственное письмо или запросить дополнительную информацию.'
    });
    assert.ok(
      Array.isArray(body?.context?.state?.details)
        && body.context.state.details.some((line) => line.includes('Email: user@example.com')),
      'details include resolved email'
    );
  });

  it('возвращает экран ошибки, если email пустой', async () => {
    const params = new URLSearchParams({
      event: 'checkEmail',
      email: '  '
    });
    const { response, body } = await request(`/api/action?${params.toString()}`);
    assert.equal(response.status, 200);
    assert.equal(body?.screen?.id, 'screen-email-invalid');
    assert.equal(body?.context?.state?.status, 'error');
    assert.equal(body?.context?.state?.message, 'Заполните поле email, чтобы продолжить');
    assert.equal(body?.context?.inputs?.email, '');
    assert.equal(body?.context?.data?.external?.success?.title ?? '', '');
    assert.equal(body?.context?.data?.external?.success?.description ?? '', '');
    assert.ok(
      Array.isArray(body?.context?.state?.details)
        && body.context.state.details.some((line) => line.includes('Заполните поле email')),
      'details contain empty email warning'
    );
  });

  it('возвращает экран ошибки при некорректном email', async () => {
    const params = new URLSearchParams({
      event: 'checkEmail',
      email: 'user@invalid'
    });
    const { response, body } = await request(`/api/action?${params.toString()}`);
    assert.equal(response.status, 200);
    assert.equal(body?.screen?.id, 'screen-email-invalid');
    assert.equal(body?.context?.state?.status, 'error');
    assert.equal(body?.context?.state?.message, 'Email указан в неверном формате');
  });

  it('сбрасывает состояние при retryFromError', async () => {
    const params = new URLSearchParams({
      event: 'retryFromError'
    });
    const { response, body } = await request(`/api/action?${params.toString()}`);
    assert.equal(response.status, 200);
    assert.equal(body?.screen?.id, 'screen-email-entry');
    assert.equal(body?.context?.state?.status, 'idle');
    assert.equal(body?.context?.inputs?.email, '');
    assert.deepEqual(body?.context?.data?.external?.prefetch, {
      title: 'Совет перед проверкой',
      description: 'Убедитесь, что адрес содержит @ и домен, прежде чем продолжить.'
    });
  });
});
