const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Allow importing from outside mobile/
config.watchFolders = [workspaceRoot];

// Add shared alias
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@frontend': path.resolve(workspaceRoot, 'frontend'),
};

module.exports = config;