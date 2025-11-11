const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

const withAndroidXFix = (config) => {
  // Modificar project build.gradle para excluir support libraries globalmente
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('allprojects {') &&
        !config.modResults.contents.includes('exclude group: \'com.android.support\'')) {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*\{/,
        `allprojects {
    configurations.all {
        exclude group: 'com.android.support'
    }
    `
      );
    }
    return config;
  });

  // Modificar app build.gradle
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // 1. Agregar configuración para excluir todas las bibliotecas de soporte
    if (!contents.includes('configurations.all {')) {
      contents = contents.replace(
        /android\s*\{/,
        `configurations.all {
    exclude group: 'com.android.support'
}

android {`
      );
    }

    // 2. Agregar configuración de packaging para resolver conflictos de META-INF
    if (!contents.includes('packaging {') && contents.includes('android {')) {
      contents = contents.replace(
        /android\s*\{/,
        `android {
    packaging {
        resources {
            pickFirst 'META-INF/androidx.appcompat_appcompat.version'
            pickFirst 'META-INF/androidx.core_core.version'
            pickFirst 'META-INF/androidx.versionedparcelable_versionedparcelable.version'
            exclude 'META-INF/DEPENDENCIES'
            exclude 'META-INF/LICENSE'
            exclude 'META-INF/LICENSE.txt'
            exclude 'META-INF/license.txt'
            exclude 'META-INF/NOTICE'
            exclude 'META-INF/NOTICE.txt'
            exclude 'META-INF/notice.txt'
            exclude 'META-INF/ASL2.0'
        }
    }
`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
};

module.exports = withAndroidXFix;
