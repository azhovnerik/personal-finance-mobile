const staticConfig = require("./app.json");

const GOOGLE_CLIENT_ID_SUFFIX = ".apps.googleusercontent.com";
const IOS_BUILD_PROFILES = new Set(["development", "app-store"]);
const APP_FUNCTIONALITY_PURPOSE = "NSPrivacyCollectedDataTypePurposeAppFunctionality";
const MONEYDRIVE_COLLECTED_DATA_TYPES = [
  "NSPrivacyCollectedDataTypeName",
  "NSPrivacyCollectedDataTypeEmailAddress",
  "NSPrivacyCollectedDataTypeOtherUserContactInfo",
  "NSPrivacyCollectedDataTypeOtherFinancialInfo",
  "NSPrivacyCollectedDataTypeCoarseLocation",
  "NSPrivacyCollectedDataTypeCustomerSupport",
  "NSPrivacyCollectedDataTypeOtherUserContent",
  "NSPrivacyCollectedDataTypeUserID",
  "NSPrivacyCollectedDataTypePurchaseHistory",
  "NSPrivacyCollectedDataTypeOtherUsageData",
  "NSPrivacyCollectedDataTypeOtherDataTypes",
].map((dataType) => ({
  NSPrivacyCollectedDataType: dataType,
  NSPrivacyCollectedDataTypeLinked: true,
  NSPrivacyCollectedDataTypeTracking: false,
  NSPrivacyCollectedDataTypePurposes: [APP_FUNCTIONALITY_PURPOSE],
}));

const resolveIosBuildProfile = () => {
  const profile = process.env.IOS_BUILD_PROFILE?.trim() || "development";

  if (!IOS_BUILD_PROFILES.has(profile)) {
    throw new Error(
      "IOS_BUILD_PROFILE must be either development or app-store",
    );
  }

  return profile;
};

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
  const iosBuildProfile = resolveIosBuildProfile();
  const plugins = [...(staticConfig.expo.plugins ?? [])];
  const iosInfoPlist = { ...staticConfig.expo.ios.infoPlist };

  if (iosBuildProfile === "development") {
    iosInfoPlist.NSLocalNetworkUsageDescription =
      "Allow moneydrive.me to connect to the local development server while debugging.";
    iosInfoPlist.NSBonjourServices = ["_expo._tcp"];
  }

  if (iosClientId) {
    plugins.push([
      "react-native-nitro-google-signin",
      {
        iosUrlScheme: resolveIosUrlScheme(iosClientId),
      },
    ]);
  }

  if (iosBuildProfile === "app-store") {
    plugins.push("./plugins/with-app-store-signing");
  }

  return {
    ...staticConfig.expo,
    ios: {
      ...staticConfig.expo.ios,
      infoPlist: iosInfoPlist,
      privacyManifests: {
        NSPrivacyCollectedDataTypes: MONEYDRIVE_COLLECTED_DATA_TYPES,
        NSPrivacyTracking: false,
      },
    },
    plugins,
  };
};
