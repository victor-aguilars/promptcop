import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import yaml from 'js-yaml';
import type { PromptocopConfig, Severity } from './types.js';
import { recommended } from './presets/recommended.js';

function deepMergeConfigs(base: PromptocopConfig, override: PromptocopConfig): PromptocopConfig {
  return {
    enabled: override.enabled ?? base.enabled,
    rules: { ...base.rules, ...override.rules } as Record<string, Severity>,
    options: {
      ...base.options,
      ...Object.fromEntries(
        Object.entries(override.options ?? {}).map(([key, val]) => [
          key,
          { ...(base.options?.[key] ?? {}), ...val },
        ]),
      ),
    },
    context: { ...base.context, ...override.context },
  };
}

function resolveExtends(config: PromptocopConfig): PromptocopConfig {
  if (!config.extends || config.extends.length === 0) {
    return config;
  }

  let base: PromptocopConfig = {};
  for (const preset of config.extends) {
    if (preset === 'promptocop:recommended') {
      base = deepMergeConfigs(base, recommended);
    }
    // Future: support external preset packages
  }

  const { extends: _ext, ...rest } = config;
  return deepMergeConfigs(base, rest);
}

export function loadConfig(startDir?: string): PromptocopConfig {
  const dir = startDir ?? process.cwd();
  const configPath = findConfigFile(dir);

  if (!configPath) {
    return recommended;
  }

  try {
    const raw = readFileSync(configPath, 'utf8');
    const parsed = yaml.load(raw) as PromptocopConfig;
    if (!parsed || typeof parsed !== 'object') {
      return recommended;
    }
    return resolveExtends(parsed);
  } catch {
    return recommended;
  }
}

function findConfigFile(startDir: string): string | null {
  let current = resolve(startDir);

  while (true) {
    const candidates = [
      resolve(current, '.promptocop.yml'),
      resolve(current, '.promptocop.yaml'),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
    const parent = dirname(current);
    if (parent === current) break; // filesystem root
    current = parent;
  }

  return null;
}
