const staticConfig = require("./app.json");

const GOOGLE_CLIENT_ID_SUFFIX = ".apps.googleusercontent.com";

const resolveIosUrlScheme = (clientId) => {
  if (!clientId.endsWith(GOOGLE_CLIENT_ID_SUFFIX)) {
    throw new Error(
      "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must be an iOS OAuth client ID ending with .apps.googleusercontent.com",
    );
  }

  return `com.googleusercontent.apps.${clientId.slice(0, -GOOGLE_CLIENT_ID_SUFFIX.length)}`;
};

module.exports = () => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const plugins = [...(staticConfig.expo.plugins ?? [])];

  if (iosClientId) {
    plugins.push([
      "react-native-nitro-google-signin",
      {
        iosUrlScheme: resolveIosUrlScheme(iosClientId),
      },
    ]);
  }

  return {
    ...staticConfig.expo,
    plugins,
  };
};
