# Configuración del Módulo Nativo de Notificaciones

## Problema Actual

El módulo nativo `WorkoutNotificationService` necesita estar registrado en `MainApplication.java` para que funcione.

## Solución Rápida

### Opción 1: Script Automático (Recomendado)

Después de ejecutar `npx expo prebuild`, ejecuta:

```bash
node scripts/register-native-module.js
```

### Opción 2: Manual

1. Ejecuta `npx expo prebuild` para generar los archivos nativos
2. Abre el archivo: `android/app/src/main/java/com/beatfit/app/MainApplication.java`
3. Agrega el import al inicio del archivo:
   ```java
   import com.beatfit.workoutnotification.WorkoutNotificationPackage;
   ```
4. En el método `getPackages()`, agrega el package:
   ```java
   packages.add(new WorkoutNotificationPackage());
   ```

Debería verse algo así:

```java
import com.beatfit.workoutnotification.WorkoutNotificationPackage;
// ... otros imports

@Override
protected List<ReactPackage> getPackages() {
    @SuppressWarnings("UnnecessaryLocalVariable")
    List<ReactPackage> packages = new PackageList(this).getPackages();
    packages.add(new WorkoutNotificationPackage()); // ← Agregar esta línea
    return packages;
}
```

## Verificación

Después de registrar el módulo:

1. Reconstruye la app: `npx expo run:android` o `eas build`
2. Abre la consola de desarrollo
3. Deberías ver: `[NativeWorkoutService] ✅ Module found!`
4. Si ves: `[NativeWorkoutService] ❌ WorkoutNotificationService native module NOT AVAILABLE!`
   - El módulo no está registrado correctamente
   - Verifica que seguiste los pasos anteriores

## Debugging

Si el módulo no aparece, verifica:

1. ✅ El módulo está en `modules/workout-notification-service/`
2. ✅ El código Kotlin compila sin errores
3. ✅ `MainApplication.java` tiene el import y el package registrado
4. ✅ La app se reconstruyó después de registrar el módulo

## Logs Útiles

Cuando ejecutes la app, busca estos logs en la consola:

- `[NativeWorkoutService] Available NativeModules:` - Lista todos los módulos disponibles
- `[NativeWorkoutService] ✅ Module found!` - El módulo está disponible
- `[NativeWorkoutService] ❌ WorkoutNotificationService native module NOT AVAILABLE!` - El módulo NO está disponible







