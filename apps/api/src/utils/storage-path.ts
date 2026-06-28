import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from '../config/env.js';

export const resolvePersonalStoragePath = (...segments: string[]) =>
  path.resolve(resolveStorageRoot(), config.personalStoragePath, ...segments);

function resolveStorageRoot(): string {
  if (path.isAbsolute(config.personalStoragePath)) {
    return path.parse(config.personalStoragePath).root;
  }

  let currentDirectory = process.cwd();

  while (currentDirectory !== path.dirname(currentDirectory)) {
    if (existsSync(path.join(currentDirectory, 'package.json')) && existsSync(path.join(currentDirectory, 'apps'))) {
      return currentDirectory;
    }

    currentDirectory = path.dirname(currentDirectory);
  }

  return process.cwd();
}
