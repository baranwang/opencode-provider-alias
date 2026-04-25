import type { Plugin } from '@opencode-ai/plugin';
import { loadModelConfig } from './model-registry';
import { optionsSchema } from './options';
import { mergeProviderConfig } from './provider-config';

export const providerAlias: Plugin = async (_ctx, opts) => {
  const { success, data: options, error } = optionsSchema.safeParse(opts);
  if (!success) {
    throw new Error(`Invalid options: ${error}`);
  }
  const modelsConfig = await loadModelConfig();

  return {
    config: async (config) => {
      config.provider ||= {};

      for (const [providerID, providerOptions] of Object.entries(options)) {
        const userProviderConfig = config.provider?.[providerID];
        if (!userProviderConfig) {
          continue;
        }
        const mergedConfig = mergeProviderConfig(
          providerOptions,
          userProviderConfig,
          modelsConfig,
        );

        config.provider[providerID] = mergedConfig;
      }
    },
  };
};
