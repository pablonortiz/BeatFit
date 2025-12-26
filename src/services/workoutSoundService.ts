import { Audio } from "expo-av";

class WorkoutSoundService {
  private exerciseSound: Audio.Sound | null = null;
  private routineSound: Audio.Sound | null = null;
  private initialized = false;
  private initializing: Promise<void> | null = null;

  async initialize() {
    if (this.initialized) return;
    if (!this.initializing) {
      this.initializing = this.loadSounds().finally(() => {
        this.initializing = null;
      });
    }
    await this.initializing;
  }

  private async loadSounds() {
    try {
      const interruptionModeIOS =
        Audio.InterruptionModeIOS?.DuckOthers ?? 1;
      const interruptionModeAndroid =
        Audio.InterruptionModeAndroid?.DuckOthers ?? 1;

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS,
        interruptionModeAndroid,
      });

      const [exerciseResult, routineResult] = await Promise.all([
        Audio.Sound.createAsync(
          require("../../assets/sounds/exercise_done_alert.wav"),
          { shouldPlay: false },
        ),
        Audio.Sound.createAsync(
          require("../../assets/sounds/routine_done_alert.wav"),
          { shouldPlay: false },
        ),
      ]);

      this.exerciseSound = exerciseResult.sound;
      this.routineSound = routineResult.sound;
      this.initialized = true;
    } catch (error) {
      console.error("[WorkoutSoundService] Error initializing sounds:", error);
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async playExerciseComplete() {
    try {
      await this.ensureInitialized();
      await this.exerciseSound?.replayAsync();
    } catch (error) {
      console.error("[WorkoutSoundService] Error playing exercise sound:", error);
    }
  }

  async playRoutineComplete() {
    try {
      await this.ensureInitialized();
      await this.routineSound?.replayAsync();
    } catch (error) {
      console.error("[WorkoutSoundService] Error playing routine sound:", error);
    }
  }

  async cleanup() {
    try {
      await this.exerciseSound?.unloadAsync();
      await this.routineSound?.unloadAsync();
      this.exerciseSound = null;
      this.routineSound = null;
      this.initialized = false;
    } catch (error) {
      console.error("[WorkoutSoundService] Error cleaning up sounds:", error);
    }
  }
}

export const workoutSoundService = new WorkoutSoundService();
