import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Routine, WorkoutSession, Exercise } from '../types';
import { storageService } from './storage';

class ImportExportService {
  /**
   * Exportar rutinas a archivo JSON
   */
  async exportRoutines(routines: Routine[], filename?: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = filename || `rutinas_${timestamp}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        type: 'routines',
        routines,
      };

      console.log('[Export] Escribiendo archivo en:', fileUri);
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
      console.log('[Export] Archivo escrito exitosamente');

      // Verificar si sharing está disponible
      const isAvailable = await Sharing.isAvailableAsync();
      console.log('[Export] Sharing disponible:', isAvailable);

      if (!isAvailable) {
        throw new Error('La funcionalidad de compartir no está disponible en este dispositivo');
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar Rutinas',
        UTI: 'public.json',
      });
      console.log('[Export] Compartido exitosamente');
    } catch (error) {
      console.error('[Export] Error exportando rutinas:', error);
      throw error;
    }
  }

  /**
   * Exportar historial de entrenamientos a archivo JSON
   */
  async exportHistory(history: WorkoutSession[], filename?: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = filename || `historial_${timestamp}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        type: 'history',
        history,
      };

      console.log('[Export] Escribiendo historial en:', fileUri);
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
      console.log('[Export] Historial escrito exitosamente');

      // Verificar si sharing está disponible
      const isAvailable = await Sharing.isAvailableAsync();
      console.log('[Export] Sharing disponible:', isAvailable);

      if (!isAvailable) {
        throw new Error('La funcionalidad de compartir no está disponible en este dispositivo');
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar Historial',
        UTI: 'public.json',
      });
      console.log('[Export] Historial compartido exitosamente');
    } catch (error) {
      console.error('[Export] Error exportando historial:', error);
      throw error;
    }
  }

  /**
   * Importar rutinas desde archivo JSON
   */
  async importRoutines(): Promise<{ success: boolean; imported: number; message: string }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return { success: false, imported: 0, message: 'Importación cancelada' };
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(fileContent);

      // Validar estructura
      if (!data.routines || !Array.isArray(data.routines)) {
        return { success: false, imported: 0, message: 'Archivo JSON inválido: falta el array de rutinas' };
      }

      // Obtener ejercicios existentes
      const existingExercises = await storageService.getExercises();
      const exercisesByName = new Map(existingExercises.map(ex => [ex.name.toLowerCase(), ex]));

      let importedCount = 0;

      // Procesar cada rutina
      for (const routine of data.routines) {
        // Validar estructura de rutina
        if (!routine.name || !routine.blocks || !Array.isArray(routine.blocks)) {
          console.warn('Rutina inválida, saltando:', routine);
          continue;
        }

        // Procesar bloques y actividades
        for (const block of routine.blocks) {
          if (!block.activities || !Array.isArray(block.activities)) {
            continue;
          }

          for (const activity of block.activities) {
            // Si es un ejercicio (no descanso), verificar si existe
            if (activity.type === 'exercise') {
              const exerciseName = activity.name.toLowerCase();

              if (!exercisesByName.has(exerciseName)) {
                // Crear el ejercicio si no existe
                const newExercise: Exercise = {
                  id: activity.id || `exercise_${Date.now()}_${Math.random()}`,
                  name: activity.name,
                  icon: activity.icon || 'fitness-outline',
                  createdAt: Date.now(),
                };

                await storageService.saveExercise(newExercise);
                exercisesByName.set(exerciseName, newExercise);
                console.log('Ejercicio creado:', newExercise.name);
              }
            }
          }
        }

        // Guardar la rutina
        await storageService.saveRoutine(routine);
        importedCount++;
      }

      return {
        success: true,
        imported: importedCount,
        message: `Se importaron ${importedCount} rutina${importedCount !== 1 ? 's' : ''} correctamente`,
      };
    } catch (error) {
      console.error('Error importando rutinas:', error);
      return {
        success: false,
        imported: 0,
        message: `Error al importar: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      };
    }
  }

  /**
   * Importar historial desde archivo JSON
   */
  async importHistory(): Promise<{ success: boolean; imported: number; message: string }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return { success: false, imported: 0, message: 'Importación cancelada' };
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(fileContent);

      // Validar estructura
      if (!data.history || !Array.isArray(data.history)) {
        return { success: false, imported: 0, message: 'Archivo JSON inválido: falta el array de historial' };
      }

      let importedCount = 0;

      // Procesar cada sesión de entrenamiento
      for (const session of data.history) {
        // Validar estructura de sesión
        if (!session.routineId || !session.routineName || !session.startedAt) {
          console.warn('Sesión inválida, saltando:', session);
          continue;
        }

        // Guardar la sesión
        await storageService.saveWorkoutSession(session);
        importedCount++;
      }

      return {
        success: true,
        imported: importedCount,
        message: `Se importaron ${importedCount} sesión${importedCount !== 1 ? 'es' : ''} de entrenamiento correctamente`,
      };
    } catch (error) {
      console.error('Error importando historial:', error);
      return {
        success: false,
        imported: 0,
        message: `Error al importar: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      };
    }
  }
}

export const importExportService = new ImportExportService();
