// expo-sharing names its iOS share extension "expo-sharing-extension", and that name is what the
// share sheet shows under our icon. This plugin sets the extension's display name to the app's name.
const { withXcodeProject } = require('expo/config-plugins');
const plist = require('@expo/plist').default;
const fs = require('fs');
const path = require('path');

const EXTENSION_DIR = 'expo-sharing-extension';

module.exports = function withShareExtensionName(config, props = {}) {
  // The extension files are written by a dangerous mod, which runs before the Xcode project mod.
  return withXcodeProject(config, (cfg) => {
    const file = path.join(cfg.modRequest.platformProjectRoot, EXTENSION_DIR, 'Info.plist');
    if (!fs.existsSync(file)) {
      console.warn(`[with-share-extension-name] ${file} not found, share extension keeps its default name`);
      return cfg;
    }
    const info = plist.parse(fs.readFileSync(file, 'utf8'));
    info.CFBundleDisplayName = props.name ?? cfg.name;
    fs.writeFileSync(file, plist.build(info));
    return cfg;
  });
};
