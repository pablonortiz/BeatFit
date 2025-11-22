const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withWorkoutNotificationService(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Agregar servicio al AndroidManifest
    if (!androidManifest.application) {
      androidManifest.application = [{}];
    }

    const application = androidManifest.application[0];
    if (!application.service) {
      application.service = [];
    }

    // Verificar si el servicio ya existe
    const serviceExists = application.service.some(
      (service) => service.$['android:name'] === 'com.beatfit.workoutnotification.WorkoutForegroundService'
    );

    if (!serviceExists) {
      application.service.push({
        $: {
          'android:name': 'com.beatfit.workoutnotification.WorkoutForegroundService',
          'android:enabled': 'true',
          'android:exported': 'false',
          'android:foregroundServiceType': 'health',
        },
      });
    }

    // Agregar permisos necesarios
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_HEALTH',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.WAKE_LOCK',
    ];

    permissions.forEach((permission) => {
      if (
        !androidManifest['uses-permission'].find(
          (p) => p.$['android:name'] === permission
        )
      ) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    return config;
  });
};

