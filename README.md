# opencode-provider-alias

[![NPM Version](https://img.shields.io/npm/v/opencode-provider-alias)](https://www.npmjs.com/package/opencode-provider-alias)
[![License](https://img.shields.io/npm/l/opencode-provider-alias)](https://www.npmjs.com/package/opencode-provider-alias)
[![LinuxDo](https://shorturl.at/ggSqS)](https://linux.do)

English | [简体中文](./README.zh-CN.md)

Alias and curate OpenCode providers with model metadata from [models.dev](https://models.dev/).

This plugin lets you define your own OpenCode provider IDs and model IDs, then hydrate them from an existing models.dev provider/model. It is useful when you want a local provider such as `my-openai` to behave like `openai`, but expose only a selected model set or local model aliases.

## Features

- Map a local OpenCode provider ID to a models.dev provider.
- Inherit all models from the target provider by default.
- Limit exposed models with exact `includes` entries.
- Use glob-style `includes` patterns and `!` exclusions, powered by `minimatch`.
- Map local model aliases to target models, for example `bar -> openai/gpt-5.5`.
- Preserve your existing OpenCode provider config such as `name`, `npm`, and `options`.

## Usage

No manual install step is required for normal OpenCode usage. Reference the package name in your OpenCode config and keep your provider definition under `provider`.

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

The resulting `my-openai` provider keeps your provider config, but its model metadata is filled from the `openai` provider in models.dev.

## Configuration

Plugin options are keyed by your local provider ID.

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

### Provider alias

Use a string when you only need to map a local provider to a models.dev provider.

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

If `provider.gpt.models` is not set, all models from `openai` are inherited.

### Include selected models

Use `includes` to expose only selected models from the target provider.

```jsonc
{
  "my-openai": {
    "provider": "openai",
    "includes": ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini"]
  }
}
```

`includes` also supports glob patterns and `!` exclusions.

```jsonc
{
  "my-openai": {
    "provider": "openai",
    "includes": ["gpt-5.*", "!gpt-5.4-nano"]
  }
}
```

Rules are applied in two phases: first all positive entries select models, then `!` entries remove matching models.

### Model alias

Use `models` to map local model IDs to target models.

```jsonc
{
  "foo": {
    "models": {
      "bar": "openai/gpt-5.5"
    }
  }
}
```

Then declare the local model under your OpenCode provider config.

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

If `provider` is also set, model references may omit the provider prefix.

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

## Behavior notes

- The plugin only modifies providers that already exist under OpenCode `provider` config.
- User-defined provider fields are preserved and merged over models.dev metadata.
- User-defined model fields are preserved and merged over hydrated model metadata.
- models.dev metadata is read from `~/.cache/opencode/models.json` when available. If it is missing, the plugin fetches `https://models.dev/api.json` and writes that cache file.

## Development

```bash
bun install
bun run test
bun run build
```

Available scripts:

- `bun run build` - build the ESM package with Rslib.
- `bun run dev` - run Rslib in watch mode.
- `bun run test` - run the Rstest suite.
- `bun run check` - run Biome checks and apply safe fixes.
- `bun run format` - format files with Biome.
