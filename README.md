# BeatFit - Tu Entrenador Personal

BeatFit es una aplicación móvil de React Native diseñada para ayudarte a contabilizar tiempos y repeticiones durante tus entrenamientos. Con una interfaz intuitiva y premium, BeatFit hace que seguir tu rutina de ejercicios sea fácil y sin interrupciones.

## Características Principales

### 👋 Onboarding Intuitivo

- Pantalla de bienvenida animada la primera vez que abres la app
- 5 slides que explican todas las funcionalidades
- Indicadores de progreso visuales
- Opción de saltar el onboarding

### 🏋️ Dos Modos de Entrenamiento

1. **Rutina Completa**: Arma tu rutina de principio a fin con bloques y repeticiones
2. **Modo Dinámico**: Agrega ejercicios sobre la marcha, uno tras otro

### 💪 Sistema de Ejercicios

- **Ejercicios por Tiempo**: Define la duración en segundos
- **Ejercicios por Repeticiones**: Especifica el número de reps
- **Descansos**: Configura períodos de recuperación
- **Iconos Intuitivos**: Cada ejercicio tiene un icono visual
- **Buscador**: Encuentra rápidamente ejercicios guardados
- **Reutilización**: Los ejercicios se guardan automáticamente para uso futuro

### 🔄 Sistema de Bloques

- Crea bloques de ejercicios
- Define cuántas veces se repite cada bloque
- Ejemplo: Bloque 1 (3 reps) → abdominales 30s, planchas 1min

### 🎯 Ejecución Sin Interrupciones

- **Temporizadores Automáticos**: Para ejercicios por tiempo
- **Reconocimiento de Voz**: Di "terminé" para marcar ejercicios por repeticiones como completados
- **Notificaciones Premium**: Vibración y sonido al completar cada ejercicio
- **Sin Tocar el Celular**: Durante ejercicios por tiempo, la app avanza automáticamente
- **Marca Manual**: Opción de tocar para completar ejercicios por repeticiones

### 📊 Gestión de Rutinas

- Guarda rutinas con nombre
- Lista de rutinas guardadas
- Visualiza información de cada rutina (duración, bloques, ejercicios)
- Elimina rutinas que ya no necesites

### 🔮 Preparado para el Futuro

- Sistema de almacenamiento con capa de abstracción
- Botón de sincronización preparado (actualmente deshabilitado)
- Fácil migración de AsyncStorage local a base de datos remota
- Campo `syncedToCloud` en las rutinas para tracking

## Estructura del Proyecto

```
BeatFit/
├── src/
│   ├── components/       # Componentes reutilizables
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── IconPicker.tsx
│   │   └── AddActivityModal.tsx
│   ├── hooks/           # Custom hooks
│   │   ├── useStorage.ts
│   │   └── useVoiceRecognition.ts
│   ├── navigation/      # Configuración de navegación
│   │   ├── AppNavigator.tsx
│   │   └── types.ts
│   ├── screens/         # Pantallas de la app
│   │   ├── HomeScreen.tsx
│   │   ├── RoutinesListScreen.tsx
│   │   ├── CreateRoutineScreen.tsx
│   │   └── ExecuteRoutineScreen.tsx
│   ├── services/        # Servicios (storage, notificaciones, etc.)
│   │   ├── storage.ts
│   │   └── notification.ts
│   ├── theme/           # Sistema de diseño
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── index.ts
│   ├── types/           # Tipos TypeScript
│   │   └── index.ts
│   └── utils/           # Utilidades
│       └── helpers.ts
├── App.tsx              # Componente principal
├── app.json             # Configuración de Expo
└── package.json
```

## Tecnologías Utilizadas

- **React Native**: Framework principal
- **Expo**: Desarrollo y acceso a APIs nativas
- **TypeScript**: Type safety
- **React Navigation**: Navegación entre pantallas
- **AsyncStorage**: Almacenamiento local
- **Expo AV**: Audio y sonidos
- **Expo Haptics**: Vibración
- **Expo Speech**: Reconocimiento de voz (preparado para integración completa)

## Instalación y Desarrollo

### Requisitos Previos

- Node.js 16+
- npm o yarn
- Expo CLI
- Expo Go app (para testing en dispositivo físico)

### Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start

# Para Android
npm run android

# Para iOS
npm run ios

# Para Web
npm run web
```

## Uso de la Aplicación

### Crear una Rutina

1. En la pantalla principal, selecciona "Crear Rutina"
2. Ingresa un nombre para tu rutina
3. Agrega actividades (ejercicios o descansos):
   - Selecciona tipo: Ejercicio o Descanso
   - Busca un ejercicio guardado o crea uno nuevo
   - Elige un icono
   - Define si es por tiempo o repeticiones
   - Ingresa la duración o cantidad de reps
4. Configura las repeticiones del bloque
5. Agrega más bloques si necesitas
6. Guarda la rutina

### Ejecutar una Rutina

1. Ve a "Mis Rutinas"
2. Selecciona una rutina y toca "Comenzar"
3. La app te guiará automáticamente:
   - Para ejercicios por tiempo: espera a que termine el contador
   - Para ejercicios por repeticiones: di "terminé" o toca el botón
4. La app vibrará y sonará al completar cada ejercicio
5. Pausa o detén la rutina en cualquier momento

## Próximas Características

- 🔄 Sincronización con base de datos remota
- 📱 Compartir rutinas con otros usuarios
- 📈 Estadísticas y seguimiento de progreso
- 🎵 Música de fondo durante entrenamientos
- ⏱️ Historial de entrenamientos completados
- 🏆 Sistema de logros y objetivos

## Migración a Base de Datos Remota

El sistema de almacenamiento está diseñado con una interfaz `StorageService` que permite cambiar fácilmente de AsyncStorage local a una base de datos remota:

```typescript
// En src/services/storage.ts

// Actual: Almacenamiento local
export const storageService: StorageService = new LocalStorageService();

// Futuro: Cambiar a almacenamiento remoto
// export const storageService: StorageService = new RemoteStorageService();
```

Para implementar la sincronización:

1. Implementar `RemoteStorageService` que cumpla la interfaz `StorageService`
2. Agregar autenticación de usuario
3. Configurar endpoints de API
4. Actualizar `isUsingRemoteStorage` a `true`
5. El botón de sincronización se habilitará automáticamente

## Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT.

## Contacto

Para preguntas o soporte, por favor abre un issue en el repositorio.

---

**¡Disfruta tus entrenamientos con BeatFit! 💪🎵**
