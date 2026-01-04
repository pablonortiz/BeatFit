import { Audio, AVPlaybackStatus } from "expo-av";

class WorkoutSoundService {
  private exerciseSound: Audio.Sound | null = null;
  private routineSound: Audio.Sound | null = null;
  private pauseSound: Audio.Sound | null = null;
  private resumeSound: Audio.Sound | null = null;
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
      const [exerciseResult, routineResult, pauseResult, resumeResult] = await Promise.all([
        Audio.Sound.createAsync(
          require("../../assets/sounds/exercise_done_alert.wav"),
          { shouldPlay: false },
        ),
        Audio.Sound.createAsync(
          require("../../assets/sounds/routine_done_alert.wav"),
          { shouldPlay: false },
        ),
        Audio.Sound.createAsync(
          require("../../assets/sounds/pause_alert.wav"),
          { shouldPlay: false },
        ),
        Audio.Sound.createAsync(
          require("../../assets/sounds/resume_alert.wav"),
          { shouldPlay: false },
        ),
      ]);

      this.exerciseSound = exerciseResult.sound;
      this.routineSound = routineResult.sound;
      this.pauseSound = pauseResult.sound;
      this.resumeSound = resumeResult.sound;
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

  // Set audio mode to duck other audio, play sound, then restore
  private async playWithDucking(sound: Audio.Sound | null) {
    if (!sound) return;

    try {
      // Set audio mode to duck other audio
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: Audio.InterruptionModeIOS?.DuckOthers ?? 2,
        interruptionModeAndroid: Audio.InterruptionModeAndroid?.DuckOthers ?? 2,
      });

      // Play the sound and wait for it to finish
      await sound.setPositionAsync(0);
      await sound.playAsync();

      // Wait for playback to complete
      await new Promise<void>((resolve) => {
        const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.setOnPlaybackStatusUpdate(null);
            resolve();
          }
        };
        sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      });

      // Reset audio mode to not interfere with other audio
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: Audio.InterruptionModeIOS?.MixWithOthers ?? 0,
        interruptionModeAndroid: Audio.InterruptionModeAndroid?.DuckOthers ?? 2,
      });
    } catch (error) {
      console.error("[WorkoutSoundService] Error in playWithDucking:", error);
    }
  }

  async playExerciseComplete() {
    try {
      await this.ensureInitialized();
      await this.playWithDucking(this.exerciseSound);
    } catch (error) {
      console.error("[WorkoutSoundService] Error playing exercise sound:", error);
    }
  }

  async playRoutineComplete() {
    try {
      await this.ensureInitialized();
      await this.playWithDucking(this.routineSound);
    } catch (error) {
      console.error("[WorkoutSoundService] Error playing routine sound:", error);
    }
  }

  async playPause() {
    try {
      await this.ensureInitialized();
      await this.playWithDucking(this.pauseSound);
    } catch (error) {
      console.error("[WorkoutSoundService] Error playing pause sound:", error);
    }
  }

  async playResume() {
    try {
      await this.ensureInitialized();
      await this.playWithDucking(this.resumeSound);
    } catch (error) {
      console.error("[WorkoutSoundService] Error playing resume sound:", error);
    }
  }

  async cleanup() {
    try {
      await Promise.all([
        this.exerciseSound?.unloadAsync(),
        this.routineSound?.unloadAsync(),
        this.pauseSound?.unloadAsync(),
        this.resumeSound?.unloadAsync(),
      ]);
      this.exerciseSound = null;
      this.routineSound = null;
      this.pauseSound = null;
      this.resumeSound = null;
      this.initialized = false;
    } catch (error) {
      console.error("[WorkoutSoundService] Error cleaning up sounds:", error);
    }
  }
}

export const workoutSoundService = new WorkoutSoundService();
