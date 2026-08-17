const {
  withEntitlementsPlist,
  withXcodeProject,
} = require("expo/config-plugins");

const withAppStoreEntitlements = (config) =>
  withEntitlementsPlist(config, (entitlementsConfig) => {
    entitlementsConfig.modResults["aps-environment"] = "production";
    return entitlementsConfig;
  });

const withAppStoreSigningIdentity = (config) =>
  withXcodeProject(config, (xcodeConfig) => {
    const configurations = xcodeConfig.modResults.pbxXCBuildConfigurationSection();

    for (const [key, buildConfiguration] of Object.entries(configurations)) {
      if (key.endsWith("_comment") || buildConfiguration.name !== "Release") {
        continue;
      }

      buildConfiguration.buildSettings.CODE_SIGN_STYLE = "Automatic";
      delete buildConfiguration.buildSettings["CODE_SIGN_IDENTITY[sdk=iphoneos*]"];
      delete buildConfiguration.buildSettings['"CODE_SIGN_IDENTITY[sdk=iphoneos*]"'];
      delete buildConfiguration.buildSettings.CODE_SIGN_IDENTITY;
    }

    return xcodeConfig;
  });

module.exports = function withAppStoreSigning(config) {
  return withAppStoreSigningIdentity(withAppStoreEntitlements(config));
};
