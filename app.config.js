// Adds what app.json cannot say on its own. Everything else stays in app.json.
//
// Google Sign-In on iOS needs the "reversed" iOS client id as a URL scheme in the native app. It is
// derived here from one value, `extra.googleIosClientId` in app.json (the iOS OAuth client id from
// Google Cloud, "1234-abc.apps.googleusercontent.com"). While that is empty the plugin is left out
// and the app simply shows no Google button; Apple sign-in and purchases need nothing here.
module.exports = ({ config }) => {
  const iosClientId = (config.extra?.googleIosClientId ?? '').trim();
  if (!iosClientId) return config;
  const suffix = '.apps.googleusercontent.com';
  if (!iosClientId.endsWith(suffix)) {
    throw new Error(`app.json extra.googleIosClientId must end with "${suffix}", got "${iosClientId}"`);
  }
  const iosUrlScheme = 'com.googleusercontent.apps.' + iosClientId.slice(0, -suffix.length);
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ['@react-native-google-signin/google-signin', { iosUrlScheme }]],
  };
};
