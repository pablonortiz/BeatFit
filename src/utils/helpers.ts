// Generar ID único
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Formatear tiempo en segundos a formato MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Formatear tiempo con horas si es necesario (HH:MM:SS)
export function formatTimeLong(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return formatTime(seconds);
}

// Convertir string de tiempo "MM:SS" a segundos
export function parseTimeToSeconds(timeString: string): number {
  const parts = timeString.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

// Calcular duración total de una rutina
export function calculateRoutineDuration(blocks: any[]): number {
  let totalSeconds = 0;

  blocks.forEach(block => {
    let blockDuration = 0;
    block.activities.forEach((activity: any) => {
      if (activity.duration) {
        blockDuration += activity.duration;
      }
      // Los ejercicios por repeticiones no tienen duración fija
    });
    totalSeconds += blockDuration * block.repetitions;
  });

  return totalSeconds;
}

// Función para buscar/filtrar ejercicios
export function searchExercises(exercises: any[], query: string) {
  if (!query.trim()) return exercises;

  const lowerQuery = query.toLowerCase();
  return exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(lowerQuery)
  );
}
