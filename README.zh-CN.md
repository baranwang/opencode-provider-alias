# opencode-provider-alias

[![NPM Version](https://img.shields.io/npm/v/opencode-provider-alias)](https://www.npmjs.com/package/opencode-provider-alias)
[![License](https://img.shields.io/npm/l/opencode-provider-alias)](https://www.npmjs.com/package/opencode-provider-alias)
[![LinuxDo](https://shorturl.at/ggSqS)](https://linux.do/t/topic/2055664)

[English](./README.md) | 简体中文

`opencode-provider-alias` 是一个 OpenCode 插件，用于把本地 provider/model 名称映射到 [models.dev](https://models.dev/) 里的真实 provider/model，并自动补全模型元数据。

它适合这种场景：你想在 OpenCode 里使用自己的本地 provider ID，例如 `my-openai`，但希望它继承 `openai` 的模型信息，同时只暴露一部分模型，或者给模型起本地别名。

## 功能

- 把本地 OpenCode provider ID 映射到 models.dev provider。
- 默认继承目标 provider 的全部模型。
- 用 `includes` 精确选择要暴露的模型。
- 用 glob 风格的 `includes` 和 `!` 排除规则筛选模型，底层使用 `minimatch`。
- 把本地模型别名映射到目标模型，例如 `bar -> openai/gpt-5.5`。
- 保留你已有的 OpenCode provider 配置，例如 `name`、`npm`、`options`。

## 使用方式

正常使用 OpenCode 插件时不需要手动安装。直接在 OpenCode 配置中引用包名，并在 `provider` 中保留你的 provider 定义。

```jsonc
{
  "plugin": [
    [
      "opencode-provider-alias@latest",
      {
        "my-openai": {
          "provider": "openai",
          "includes": [
            "gpt-5.5",
            "gpt-5.4",
            "gpt-5.4-mini",
            "gpt-5.3-codex",
            "gpt-5.3-codex-spark"
          ]
        }
      }
    ]
  ],
  "provider": {
    "my-openai": {
      "npm": "@ai-sdk/openai",
      "name": "My OpenAI",
      "options": {
        "apiKey": "{env:OPENAI_API_KEY}",
        "baseURL": "https://example.com/v1"
      }
    }
  }
}
```

最终的 `my-openai` provider 会保留你的 provider 配置，但模型元数据会从 models.dev 的 `openai` provider 中补全。

## 配置

插件配置以本地 provider ID 作为 key。

```ts
type PluginOptions = Record<
  string,
  | string
  | {
      provider?: string
      includes?: string[]
      models?: Record<string, string>
    }
>
```

### Provider 映射

如果只需要把本地 provider 映射到 models.dev provider，可以使用字符串形式。

```jsonc
{
  "plugin": [
    [
      "opencode-provider-alias@latest",
      {
        "gpt": "openai"
      }
    ]
  ],
  "provider": {
    "gpt": {
      "npm": "@ai-sdk/openai",
      "name": "GPT",
      "options": {
        "apiKey": "{env:OPENAI_API_KEY}"
      }
    }
  }
}
```

如果没有配置 `provider.gpt.models`，则会继承 `openai` 的全部模型。

### 选择模型

使用 `includes` 只暴露目标 provider 中的部分模型。

```jsonc
{
  "my-openai": {
    "provider": "openai",
    "includes": ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini"]
  }
}
```

`includes` 也支持 glob 和 `!` 排除。

```jsonc
{
  "my-openai": {
    "provider": "openai",
    "includes": ["gpt-5.*", "!gpt-5.4-nano"]
  }
}
```

规则分两步执行：先用正向规则选中模型，再用 `!` 规则移除匹配的模型。

### 模型别名

使用 `models` 把本地模型 ID 映射到目标模型。

```jsonc
{
  "foo": {
    "models": {
      "bar": "openai/gpt-5.5"
    }
  }
}
```

同时需要在 OpenCode provider 配置中声明这个本地模型。

```jsonc
{
  "provider": {
    "foo": {
      "npm": "@ai-sdk/openai",
      "name": "Foo",
      "options": {
        "apiKey": "{env:OPENAI_API_KEY}"
      },
      "models": {
        "bar": {}
      }
    }
  }
}
```

如果同时配置了 `provider`，模型引用可以省略 provider 前缀。

```jsonc
{
  "foo": {
    "provider": "openai",
    "models": {
      "bar": "gpt-5.5"
    }
  }
}
```

## 行为说明

- 插件只会修改已经存在于 OpenCode `provider` 配置中的 provider。
- 用户配置的 provider 字段会被保留，并覆盖 models.dev 元数据。
- 用户配置的 model 字段会被保留，并覆盖补全得到的模型元数据。
- models.dev 元数据优先读取 `~/.cache/opencode/models.json`。如果该文件不存在，插件会请求 `https://models.dev/api.json` 并写入缓存。

## 开发

```bash
bun install
bun run test
bun run build
```

可用脚本：

- `bun run build` - 使用 Rslib 构建 ESM 包。
- `bun run dev` - 以 watch 模式运行 Rslib。
- `bun run test` - 运行 Rstest 测试。
- `bun run check` - 运行 Biome 检查并应用安全修复。
- `bun run format` - 使用 Biome 格式化文件。
