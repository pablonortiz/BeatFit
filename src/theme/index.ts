import { colors } from './colors';
import { typography } from './typography';

export const theme = {
  colors,
  typography,

  // Espaciado
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Bordes redondeados
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 999,
  },

  // Sombras
  shadows: {
    small: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  // Tamaños de iconos
  iconSizes: {
    sm: 20,
    md: 24,
    lg: 32,
    xl: 48,
    xxl: 64,
  },
};

export { colors } from './colors';
export { typography } from './typography';
export type Theme = typeof theme;
