import { mergeWith } from 'es-toolkit';
import { merge } from 'es-toolkit/compat';
import {
  getModelConfig,
  type ModelsConfig,
  type ProviderConfig,
  resolveIncludedModels,
  toModelsConfig,
} from './model-registry';
import type { Config } from './options';

export const mergeProviderConfig = (
  providerOptions: string | Config,
  userProviderConfig: ProviderConfig,
  modelsConfig: ModelsConfig,
) => {
  const finalConfig: Config =
    typeof providerOptions === 'string'
      ? {
          provider: providerOptions,
        }
      : providerOptions;
  const baseProviderConfig = finalConfig.provider
    ? (modelsConfig[finalConfig.provider] ?? {})
    : {};
  const modelAliases = finalConfig.models ?? {};
  const userModels = toModelsConfig(userProviderConfig.models);
  const baseModels = toModelsConfig(baseProviderConfig.models);
  const includedModels = finalConfig.includes
    ? resolveIncludedModels(finalConfig.includes, baseModels, userModels)
    : undefined;
  const providerConfig = merge({}, userProviderConfig) as ProviderConfig;
  if (includedModels) {
    providerConfig.models = includedModels;
  }
  const aliasModels = Object.fromEntries(
    Object.entries(modelAliases).map(([modelID, modelRef]) => [
      modelID,
      merge(
        {},
        getModelConfig(modelsConfig, modelRef, finalConfig.provider),
        { id: modelID },
        userModels[modelID] ?? {},
      ),
    ]),
  );

  return mergeWith(
    merge({}, baseProviderConfig),
    providerConfig,
    (objValue, srcValue, key) => {
      if (key !== 'models') {
        return undefined;
      }

      const hasUserModels = Array.isArray(srcValue)
        ? srcValue.length > 0
        : !!srcValue && Object.keys(srcValue).length > 0;

      if (!hasUserModels) {
        return undefined;
      }

      const baseModels = toModelsConfig(objValue);
      const sourceModels = toModelsConfig(srcValue);

      const mergedModels = Object.fromEntries(
        Object.entries(sourceModels).map(([modelID, modelOverride]) => [
          modelID,
          merge(
            merge({}, aliasModels[modelID] ?? baseModels[modelID]),
            modelOverride,
          ),
        ]),
      );

      return merge(mergedModels, aliasModels);
    },
  );
};
