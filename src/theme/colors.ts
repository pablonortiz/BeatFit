// Paleta de colores premium para BeatFit
export const colors = {
  // Colores primarios - Vibrantes y energéticos
  primary: '#FF6B35', // Naranja energético
  primaryDark: '#E85A2A',
  primaryLight: '#FF8659',

  // Colores secundarios - Azul profundo
  secondary: '#004E89',
  secondaryDark: '#003A6A',
  secondaryLight: '#1A6BA8',

  // Acento - Verde vibrante para éxitos
  accent: '#00D9A3',
  accentDark: '#00C090',
  accentLight: '#1AFFBD',

  // Backgrounds - Oscuro premium
  background: '#0F0F0F',
  backgroundLight: '#1A1A1A',
  backgroundCard: '#252525',
  backgroundCardLight: '#2F2F2F',

  // Textos
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#707070',
  textDisabled: '#404040',

  // Estados
  success: '#00D9A3',
  warning: '#FFB800',
  error: '#FF3B3B',
  info: '#4A90E2',

  // Ejercicio vs Descanso
  exercise: '#FF6B35',
  rest: '#4A90E2',

  // Sombras y bordes
  border: '#303030',
  borderLight: '#404040',
  shadow: 'rgba(0, 0, 0, 0.3)',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',

  // Transparencias
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};

export type ColorName = keyof typeof colors;
