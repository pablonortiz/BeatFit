const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

const withAndroidXFix = (config) => {
  // Modificar project build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('allprojects {')) {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*\{/,
        `allprojects {
    configurations.all {
        exclude group: 'com.android.support', module: 'support-compat'
        exclude group: 'com.android.support', module: 'versionedparcelable'
    }
    `
      );
    }
    return config;
  });

  // Modificar app build.gradle
  config = withAppBuildGradle(config, (config) => {
    // Agregar configuración para excluir bibliotecas de soporte antiguas
    if (!config.modResults.contents.includes('exclude group: \'com.android.support\'')) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*\{/,
        `configurations.all {
    exclude group: 'com.android.support', module: 'support-compat'
    exclude group: 'com.android.support', module: 'support-core-utils'
    exclude group: 'com.android.support', module: 'support-core-ui'
    exclude group: 'com.android.support', module: 'support-v4'
    exclude group: 'com.android.support', module: 'versionedparcelable'
}

dependencies {`
      );
    }
    return config;
  });

  return config;
};

module.exports = withAndroidXFix;
