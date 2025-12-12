import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { ExerciseIcon } from '../types';

interface IconPickerProps {
  selectedIcon: ExerciseIcon;
  onSelect: (icon: ExerciseIcon) => void;
  visible: boolean;
  onClose: () => void;
}

export const AVAILABLE_ICONS: ExerciseIcon[] = [
  'fitness',
  'walk',
  'bicycle',
  'body',
  'barbell',
  'heart',
  'timer',
  'water',
  'nutrition',
  'accessibility',
  'time-outline',
  'pause',
  'play',
  'stop',
  'stopwatch',
  'alarm',
  'pulse',
  'flame',
  'stats-chart',
  'medal',
  'trophy',
  'tennisball',
  'football',
  'basketball',
  'american-football',
  'cloud',
  'rainy',
  'snow',
  'leaf',
  'sunny',
  'moon',
  'musical-notes',
  'flash',
];

export const sanitizeExerciseIcon = (icon: string): ExerciseIcon => {
  return AVAILABLE_ICONS.includes(icon as ExerciseIcon) ? (icon as ExerciseIcon) : 'fitness';
};

export function IconPicker({ selectedIcon, onSelect, visible, onClose }: IconPickerProps) {
  const safeSelected = sanitizeExerciseIcon(selectedIcon);

  const handleSelect = (icon: ExerciseIcon) => {
    onSelect(icon);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Selecciona un ícono</Text>

          <ScrollView
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {AVAILABLE_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon}
                style={[
                  styles.iconButton,
                  safeSelected === icon && styles.iconButtonSelected,
                ]}
                onPress={() => handleSelect(icon)}
              >
                <Ionicons
                  name={icon as any}
                  size={32}
                  color={
                    safeSelected === icon
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  container: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  title: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundCardLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight + '20',
  },
  closeButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    ...theme.typography.button,
    color: theme.colors.textSecondary,
  },
});
