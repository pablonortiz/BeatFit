# BeatFit - Your Personal Trainer

BeatFit is a React Native mobile app designed to help you track times and reps during your workouts. With an intuitive, premium interface, BeatFit makes following your exercise routine easy and seamless.

## Key Features

### Intuitive Onboarding

- Animated welcome screen on first launch
- 5 slides explaining all features
- Visual progress indicators
- Option to skip onboarding

### Two Training Modes

1. **Full Routine**: Build your routine from start to finish with blocks and reps
2. **Dynamic Mode**: Add exercises on the fly, one after another

### Exercise System

- **Timed Exercises**: Set duration in seconds
- **Rep-Based Exercises**: Specify the number of reps
- **Rest Periods**: Configure recovery time
- **Intuitive Icons**: Each exercise has a visual icon
- **Search**: Quickly find saved exercises
- **Reuse**: Exercises are automatically saved for future use

### Block System

- Create exercise blocks
- Define how many times each block repeats
- Example: Block 1 (3 reps) → crunches 30s, planks 1min

### Seamless Execution

- **Automatic Timers**: For timed exercises
- **Voice Recognition**: Say "done" to mark rep-based exercises as completed
- **Premium Notifications**: Vibration and sound on exercise completion
- **Hands-Free**: During timed exercises, the app advances automatically
- **Manual Completion**: Tap to complete rep-based exercises

### Routine Management

- Save routines with a name
- View saved routines list
- See routine details (duration, blocks, exercises)
- Delete routines you no longer need

### Future-Ready

- Storage system with abstraction layer
- Sync button ready (currently disabled)
- Easy migration from local AsyncStorage to remote database
- `syncedToCloud` field in routines for tracking

## Project Structure

```
BeatFit/
├── src/
│   ├── components/       # Reusable components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── IconPicker.tsx
│   │   └── AddActivityModal.tsx
│   ├── hooks/           # Custom hooks
│   │   ├── useStorage.ts
│   │   └── useVoiceRecognition.ts
│   ├── navigation/      # Navigation config
│   │   ├── AppNavigator.tsx
│   │   └── types.ts
│   ├── screens/         # App screens
│   │   ├── HomeScreen.tsx
│   │   ├── RoutinesListScreen.tsx
│   │   ├── CreateRoutineScreen.tsx
│   │   └── ExecuteRoutineScreen.tsx
│   ├── services/        # Services (storage, notifications, etc.)
│   │   ├── storage.ts
│   │   └── notification.ts
│   ├── theme/           # Design system
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── index.ts
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   └── utils/           # Utilities
│       └── helpers.ts
├── App.tsx              # Main component
├── app.json             # Expo config
└── package.json
```

## Tech Stack

- **React Native**: Core framework
- **Expo**: Development and native API access
- **TypeScript**: Type safety
- **React Navigation**: Screen navigation
- **AsyncStorage**: Local storage
- **Expo AV**: Audio and sounds
- **Expo Haptics**: Vibration
- **Expo Speech**: Voice recognition (ready for full integration)

## Installation

### Prerequisites

- Node.js 16+
- npm or yarn
- Expo CLI
- Expo Go app (for testing on a physical device)

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# For Android
npm run android

# For iOS
npm run ios

# For Web
npm run web
```

## How to Use

### Creating a Routine

1. On the home screen, select "Create Routine"
2. Enter a name for your routine
3. Add activities (exercises or rest periods):
   - Select type: Exercise or Rest
   - Search for a saved exercise or create a new one
   - Choose an icon
   - Pick time-based or rep-based
   - Enter the duration or rep count
4. Set block repetitions
5. Add more blocks if needed
6. Save the routine

### Running a Routine

1. Go to "My Routines"
2. Select a routine and tap "Start"
3. The app will guide you automatically:
   - For timed exercises: wait for the countdown to finish
   - For rep-based exercises: say "done" or tap the button
4. The app will vibrate and play a sound when each exercise is completed
5. Pause or stop the routine at any time

## Upcoming Features

- Sync with remote database
- Share routines with other users
- Progress tracking and statistics
- Background music during workouts
- Workout completion history
- Achievements and goals system

## Remote Database Migration

The storage system is designed with a `StorageService` interface that allows easily switching from local AsyncStorage to a remote database:

```typescript
// In src/services/storage.ts

// Current: Local storage
export const storageService: StorageService = new LocalStorageService();

// Future: Switch to remote storage
// export const storageService: StorageService = new RemoteStorageService();
```

To implement sync:

1. Implement `RemoteStorageService` that fulfills the `StorageService` interface
2. Add user authentication
3. Configure API endpoints
4. Set `isUsingRemoteStorage` to `true`
5. The sync button will be enabled automatically

## License

MIT
