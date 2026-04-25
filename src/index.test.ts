import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createOpencodeClient,
  createOpencodeServer,
  type ServerOptions,
} from '@opencode-ai/sdk';
import { expect, test } from '@rstest/core';
import { providerAlias } from './index';
import { sanitizeModelsConfig } from './model-registry';
import { mergeProviderConfig } from './provider-config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createTestOpencode = async (options: ServerOptions) => {
  const server = await createOpencodeServer(options);
  const username = process.env.OPENCODE_SERVER_USERNAME ?? 'opencode';
  const password = process.env.OPENCODE_SERVER_PASSWORD;
  const authorization = password
    ? `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    : undefined;
  const client = createOpencodeClient({
    baseUrl: server.url,
    fetch: (request) => {
      if (!authorization) {
        return fetch(request);
      }

      const headers = new Headers(request.headers);
      headers.set('authorization', authorization);

      return fetch(new Request(request, { headers }));
    },
  });

  return { client, server };
};

const getProvider = async (
  client: ReturnType<typeof createOpencodeClient>,
  providerID: string,
) => {
  const providers = await client.config.providers();
  if (!providers.data) {
    throw new Error('Failed to load providers');
  }

  return providers.data.providers.find((item) => item.id === providerID);
};

test('用户用字符串把自定义 provider 映射到 models.dev provider', async () => {
  const { client, server } = await createTestOpencode({
    port: 0,
    config: {
      plugin: [
        [
          path.join(__dirname, '..'),
          {
            gpt: 'openai',
          },
        ] as unknown as string,
      ],
      provider: {
        gpt: {
          npm: '@ai-sdk/openai',
          name: 'GPT',
          options: {
            apiKey: '',
            baseUrl: '',
          },
        },
      },
    },
  });

  const gptProvider = await getProvider(client, 'gpt');
  expect(gptProvider?.models).toBeDefined();
  expect(Object.keys(gptProvider?.models ?? {})).not.toHaveLength(0);
  expect(gptProvider?.models?.['gpt-5.5']).toHaveProperty('family', 'gpt');
  server.close();
});

test('用户只暴露自己在 provider.models 中声明的模型', async () => {
  const { client, server } = await createTestOpencode({
    port: 0,
    config: {
      plugin: [
        [
          path.join(__dirname, '..'),
          {
            gpt: 'openai',
          },
        ] as unknown as string,
      ],
      provider: {
        gpt: {
          npm: '@ai-sdk/openai',
          name: 'GPT',
          options: {
            apiKey: '',
            baseUrl: '',
          },
          models: {
            'gpt-5.5': {},
          },
        },
      },
    },
  });

  const gptProvider = await getProvider(client, 'gpt');
  expect(gptProvider?.models).toBeDefined();
  expect(Object.keys(gptProvider?.models ?? {})).toHaveLength(1);
  expect(gptProvider?.models?.['gpt-5.5']).toHaveProperty('family', 'gpt');
  expect(gptProvider?.models).not.toHaveProperty('gpt-5.4');
  server.close();
});

test('用户可以用 includes 选择要暴露的 models.dev 模型', async () => {
  const includedModels = [
    'gpt-5.5',
    'gpt-5.4',
    'gpt-5.4-mini',
    'gpt-5.3-codex',
    'gpt-5.3-codex-spark',
  ];
  const { client, server } = await createTestOpencode({
    port: 0,
    config: {
      plugin: [
        [
          path.join(__dirname, '..'),
          {
            'team-gpt': {
              provider: 'openai',
              includes: includedModels,
            },
          },
        ] as unknown as string,
      ],
      provider: {
        'team-gpt': {
          npm: '@ai-sdk/openai',
          name: 'Team GPT',
          options: {
            apiKey: '',
            baseUrl: '',
          },
        },
      },
    },
  });

  const gptProvider = await getProvider(client, 'team-gpt');
  expect(Object.keys(gptProvider?.models ?? {}).sort()).toEqual(
    [...includedModels].sort(),
  );
  expect(gptProvider?.models?.['gpt-5.5']).toHaveProperty('family', 'gpt');
  expect(gptProvider?.models).not.toHaveProperty('gpt-5.2');
  server.close();
});

test('用户可以用 includes 通配符并用 ! 排除模型', async () => {
  const { client, server } = await createTestOpencode({
    port: 0,
    config: {
      plugin: [
        [
          path.join(__dirname, '..'),
          {
            'team-gpt': {
              provider: 'openai',
              includes: ['gpt-5.*', '!gpt-5.4-nano'],
            },
          },
        ] as unknown as string,
      ],
      provider: {
        'team-gpt': {
          npm: '@ai-sdk/openai',
          name: 'Team GPT',
          options: {
            apiKey: '',
            baseUrl: '',
          },
        },
      },
    },
  });

  const gptProvider = await getProvider(client, 'team-gpt');
  const modelIDs = Object.keys(gptProvider?.models ?? {});
  expect(modelIDs.length).toBeGreaterThan(1);
  expect(modelIDs.every((modelID) => modelID.startsWith('gpt-5.'))).toBe(true);
  expect(gptProvider?.models?.['gpt-5.5']).toHaveProperty('family', 'gpt');
  expect(gptProvider?.models).not.toHaveProperty('gpt-5.4-nano');
  expect(gptProvider?.models).not.toHaveProperty('gpt-5');
  server.close();
});

test('用户用对象配置把本地模型别名映射到目标模型', async () => {
  const { client, server } = await createTestOpencode({
    port: 0,
    config: {
      plugin: [
        [
          path.join(__dirname, '..'),
          {
            foo: {
              models: {
                bar: 'openai/gpt-5.5',
              },
            },
          },
        ] as unknown as string,
      ],
      provider: {
        foo: {
          npm: '@ai-sdk/openai',
          name: 'Foo',
          options: {
            apiKey: '',
            baseUrl: '',
          },
          models: {
            bar: {},
          },
        },
      },
    },
  });

  const gptProvider = await getProvider(client, 'foo');
  expect(gptProvider?.models).toBeDefined();
  expect(Object.keys(gptProvider?.models ?? {})).toHaveLength(1);
  expect(gptProvider?.models?.bar).toHaveProperty('family', 'gpt');
  server.close();
});

test('用户映射 provider 时保留自己配置的 provider 信息', async () => {
  const { client, server } = await createTestOpencode({
    port: 0,
    config: {
      plugin: [
        [
          path.join(__dirname, '..'),
          {
            gpt: 'openai',
          },
        ] as unknown as string,
      ],
      provider: {
        gpt: {
          npm: '@ai-sdk/openai',
          name: 'Team GPT',
          options: {
            apiKey: 'test-key',
            baseUrl: 'https://example.com/v1',
          },
        },
      },
    },
  });

  const gptProvider = await getProvider(client, 'gpt');
  expect(gptProvider).toHaveProperty('name', 'Team GPT');
  expect(gptProvider?.options).toHaveProperty(
    'baseUrl',
    'https://example.com/v1',
  );
  server.close();
});

test('用户可以覆盖被补全模型的展示信息', async () => {
  const { client, server } = await createTestOpencode({
    port: 0,
    config: {
      plugin: [
        [
          path.join(__dirname, '..'),
          {
            gpt: 'openai',
          },
        ] as unknown as string,
      ],
      provider: {
        gpt: {
          npm: '@ai-sdk/openai',
          name: 'GPT',
          options: {
            apiKey: '',
            baseUrl: '',
          },
          models: {
            'gpt-5.5': {
              name: 'Team GPT 5.5',
            },
          },
        },
      },
    },
  });

  const gptProvider = await getProvider(client, 'gpt');
  expect(gptProvider?.models?.['gpt-5.5']).toHaveProperty('family', 'gpt');
  expect(gptProvider?.models?.['gpt-5.5']).toHaveProperty(
    'name',
    'Team GPT 5.5',
  );
  server.close();
});

test('用户可以在对象配置中使用同 provider 下的模型短名称', async () => {
  const { client, server } = await createTestOpencode({
    port: 0,
    config: {
      plugin: [
        [
          path.join(__dirname, '..'),
          {
            foo: {
              provider: 'openai',
              models: {
                bar: 'gpt-5.5',
              },
            },
          },
        ] as unknown as string,
      ],
      provider: {
        foo: {
          npm: '@ai-sdk/openai',
          name: 'Foo',
          options: {
            apiKey: '',
            baseUrl: '',
          },
          models: {
            bar: {},
          },
        },
      },
    },
  });

  const fooProvider = await getProvider(client, 'foo');
  expect(fooProvider?.models?.bar).toHaveProperty('family', 'gpt');
  server.close();
});

test('用户只在插件中配置 provider 时不会创建新的 provider', async () => {
  const { client, server } = await createTestOpencode({
    port: 0,
    config: {
      plugin: [
        [
          path.join(__dirname, '..'),
          {
            'provider-alias-missing-provider': 'openai',
          },
        ] as unknown as string,
      ],
      provider: {},
    },
  });

  const missingProvider = await getProvider(
    client,
    'provider-alias-missing-provider',
  );
  expect(missingProvider).toBeUndefined();
  server.close();
});

test('用户传入非法插件配置时会收到配置错误', async () => {
  await expect(
    providerAlias({} as Parameters<typeof providerAlias>[0], {
      gpt: {
        models: {
          bar: 123,
        },
      },
    }),
  ).rejects.toThrow('Invalid options');
});

test('models.dev provider 顶层元数据会被清理但模型字段保留', () => {
  const sanitized = sanitizeModelsConfig({
    openai: {
      id: 'openai',
      env: 'OPENAI_API_KEY',
      doc: 'provider doc',
      name: 'OpenAI',
      models: {
        'gpt-5.5': {
          id: 'gpt-5.5',
          env: 'MODEL_ENV',
          doc: 'model doc',
          family: 'gpt',
        },
      },
    },
  });

  expect(sanitized.openai).not.toHaveProperty('id');
  expect(sanitized.openai).not.toHaveProperty('env');
  expect(sanitized.openai).not.toHaveProperty('doc');
  expect(sanitized.openai).toHaveProperty('name', 'OpenAI');
  expect(sanitized.openai.models?.['gpt-5.5']).toMatchObject({
    id: 'gpt-5.5',
    env: 'MODEL_ENV',
    doc: 'model doc',
    family: 'gpt',
  });
});

test('用户配置的 provider 顶层 id/env/doc 会在合并后保留', () => {
  const merged = mergeProviderConfig(
    'openai',
    {
      id: 'user-provider',
      env: 'USER_PROVIDER_ENV',
      doc: 'user provider doc',
      name: 'User Provider',
    },
    {},
  );

  expect(merged).toHaveProperty('id', 'user-provider');
  expect(merged).toHaveProperty('env', 'USER_PROVIDER_ENV');
  expect(merged).toHaveProperty('doc', 'user provider doc');
  expect(merged).toHaveProperty('name', 'User Provider');
});
