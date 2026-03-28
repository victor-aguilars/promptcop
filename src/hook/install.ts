import { existsSync } from 'node:fs';
import { getTarget } from './targets.js';

export function install(targetName = 'claude'): void {
  const target = getTarget(targetName);
  const config = target.readConfig();

  if (target.isInstalled(config)) {
    console.log(`promptocop hook is already installed in ${target.configPath}`);
    return;
  }

  const updated = target.addEntry(config);
  target.writeConfig(updated);
  console.log(`promptocop hook installed in ${target.configPath}`);
  console.log('Prompts will now be linted before being sent to the editor.');
}

export function uninstall(targetName = 'claude'): void {
  const target = getTarget(targetName);

  if (!existsSync(target.configPath)) {
    console.log('No config file found — nothing to uninstall.');
    return;
  }

  const config = target.readConfig();

  if (!target.isInstalled(config)) {
    console.log('promptocop hook is not installed.');
    return;
  }

  const updated = target.removeEntry(config);
  target.writeConfig(updated);
  console.log(`promptocop hook removed from ${target.configPath}`);
}
