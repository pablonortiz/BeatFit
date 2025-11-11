const { withAndroidManifest } = require('@expo/config-plugins');

const withVoiceConfig = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    // Asegurar que los permisos estén presentes
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.RECORD_AUDIO',
      'android.permission.INTERNET',
    ];

    permissions.forEach((permission) => {
      if (
        !androidManifest['uses-permission'].find(
          (perm) => perm.$['android:name'] === permission
        )
      ) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // Agregar queries para intent de reconocimiento de voz
    if (!androidManifest.queries) {
      androidManifest.queries = [{}];
    }

    if (!androidManifest.queries[0].intent) {
      androidManifest.queries[0].intent = [];
    }

    // Intent para RecognizerIntent.ACTION_RECOGNIZE_SPEECH
    const recognizeSpeechIntent = {
      action: [
        {
          $: { 'android:name': 'android.speech.action.RECOGNIZE_SPEECH' },
        },
      ],
    };

    androidManifest.queries[0].intent.push(recognizeSpeechIntent);

    return config;
  });
};

module.exports = withVoiceConfig;
