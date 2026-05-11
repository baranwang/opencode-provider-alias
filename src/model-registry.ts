import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isPlainObject, omit } from 'es-toolkit';
import { Minimatch } from 'minimatch';

export type ModelConfig = Record<string, unknown>;

export type ProviderConfig = {
  models?: Record<string, ModelConfig>;
} & Record<string, unknown>;

export type ModelsConfig = Record<string, ProviderConfig>;

const opencodeCacheDir = path.join(os.homedir(), '.cache', 'opencode');

export const toModelsConfig = (value: unknown): Record<string, ModelConfig> => {
  if (!isPlainObject(value)) {
    return {};
  }

  return value as Record<string, ModelConfig>;
};

export const sanitizeModelsConfig = (value: unknown): ModelsConfig => {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([providerID, providerConfig]) => {
      if (!isPlainObject(providerConfig)) {
        return [providerID, {}];
      }

      return [providerID, omit(providerConfig, ['id', 'env', 'doc'])];
    }),
  );
};

export const loadModelConfig = async (): Promise<ModelsConfig> => {
  const modelsConfigPath = path.join(opencodeCacheDir, 'models.json');
  if (fs.existsSync(modelsConfigPath)) {
    return sanitizeModelsConfig(
      JSON.parse(fs.readFileSync(modelsConfigPath, 'utf-8')),
    );
  }
  return fetch('https://models.dev/api.json')
    .then((res) => res.json())
    .then((data) => {
      const sanitizedData = sanitizeModelsConfig(data);
      fs.mkdirSync(opencodeCacheDir, { recursive: true });
      fs.writeFileSync(modelsConfigPath, JSON.stringify(sanitizedData));
      return sanitizedData;
    });
};

export const getModelConfig = (
  modelsConfig: ModelsConfig,
  modelRef: string,
  fallbackProvider?: string,
) => {
  const separatorIndex = modelRef.indexOf('/');
  const providerID =
    separatorIndex === -1
      ? fallbackProvider
      : modelRef.slice(0, separatorIndex);
  const modelID =
    separatorIndex === -1 ? modelRef : modelRef.slice(separatorIndex + 1);

  if (!providerID || !modelID) {
    return {};
  }

  return omit(modelsConfig[providerID]?.models?.[modelID] ?? {}, [
    'experimental',
  ]);
};

export const resolveIncludedModels = (
  includes: string[],
  baseModels: Record<string, ModelConfig>,
  userModels: Record<string, ModelConfig>,
) => {
  const sourceModelIDs = new Set([
    ...Object.keys(baseModels),
    ...Object.keys(userModels),
  ]);
  const selectedModelIDs = new Set<string>();
  const matchers = includes.map((pattern) => ({
    exclude: pattern.startsWith('!'),
    matcher: new Minimatch(
      pattern.startsWith('!') ? pattern.slice(1) : pattern,
    ),
    pattern,
  }));

  for (const { exclude, matcher, pattern } of matchers) {
    if (exclude) {
      continue;
    }

    if (!pattern.includes('*')) {
      selectedModelIDs.add(pattern);
      continue;
    }

    for (const modelID of Array.from(sourceModelIDs)) {
      if (matcher.match(modelID)) {
        selectedModelIDs.add(modelID);
      }
    }
  }

  for (const { exclude, matcher } of matchers) {
    if (!exclude) {
      continue;
    }

    for (const modelID of Array.from(selectedModelIDs)) {
      if (matcher.match(modelID)) {
        selectedModelIDs.delete(modelID);
      }
    }
  }

  return Object.fromEntries(
    Array.from(selectedModelIDs).map((modelID) => [
      modelID,
      userModels[modelID] ?? {},
    ]),
  );
};
