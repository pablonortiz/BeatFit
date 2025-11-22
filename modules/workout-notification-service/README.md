# Workout Notification Service - Módulo Nativo

Este módulo nativo de Android proporciona un servicio de foreground que actualiza la notificación del entrenamiento **cada segundo** usando código nativo de Kotlin.

## Características

- ✅ **Actualización cada segundo** - Usa código nativo de Android, no JavaScript
- ✅ **Foreground Service** - Mantiene el servicio activo en segundo plano
- ✅ **Notificación avanzada** - Con progress bar, estilo BigText, y color personalizado
- ✅ **Cálculos precisos** - Tiempos calculados usando timestamps nativos

## Estructura

```
modules/workout-notification-service/
├── android/
│   ├── src/main/java/com/beatfit/workoutnotification/
│   │   ├── WorkoutNotificationModule.kt      # Módulo React Native
│   │   ├── WorkoutNotificationPackage.kt    # Package de React Native
│   │   └── WorkoutForegroundService.kt      # Servicio Android
│   └── build.gradle                          # Configuración de build
├── plugin/
│   └── withWorkoutNotificationService.js     # Plugin de Expo
├── index.js                                   # Export del módulo
└── package.json
```

## Uso

```typescript
import { nativeWorkoutService } from '../services/nativeWorkoutService';

// Iniciar servicio
await nativeWorkoutService.startService({
  routineName: 'Rutina Full Body',
  currentExercise: 'Sentadillas',
  startTime: Date.now(),
  isPaused: false,
  totalPausedTime: 0,
  exerciseType: 'time',
  exerciseDuration: 60,
  exerciseStartTime: Date.now(),
  progress: 0.35,
});

// Actualizar datos
await nativeWorkoutService.updateWorkoutData({ ... });

// Detener servicio
await nativeWorkoutService.stopService();
```

## Registro Manual (si es necesario)

Si el módulo no se registra automáticamente, agrega esto a `android/app/src/main/java/.../MainApplication.java`:

```java
import com.beatfit.workoutnotification.WorkoutNotificationPackage;

// En getPackages():
packages.add(new WorkoutNotificationPackage());
```

## Notas

- El servicio se ejecuta en foreground, por lo que muestra un icono en la barra de estado
- La notificación se actualiza cada segundo usando un Handler nativo de Android
- No depende de JavaScript para las actualizaciones, solo para iniciar/detener

