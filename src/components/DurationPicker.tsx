import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Button } from './Button';

interface DurationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (seconds: number) => void;
  initialSeconds?: number;
}

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const REPEAT_COUNT = 500; // Suficiente para scroll largo y sensación de infinito

export function DurationPicker({
  visible,
  onClose,
  onSelect,
  initialSeconds = 30,
}: DurationPickerProps) {
  const hours = Math.floor(initialSeconds / 3600);
  const minutes = Math.floor((initialSeconds % 3600) / 60);
  const seconds = initialSeconds % 60;

  const [selectedHours, setSelectedHours] = useState(hours);
  const [selectedMinutes, setSelectedMinutes] = useState(minutes);
  const [selectedSeconds, setSelectedSeconds] = useState(seconds);

  const hoursScrollRef = useRef<ScrollView>(null);
  const minutesScrollRef = useRef<ScrollView>(null);
  const secondsScrollRef = useRef<ScrollView>(null);

  // Generar arrays infinitos
  const createInfiniteArray = (max: number) => {
    const arr = [];
    for (let i = 0; i < REPEAT_COUNT; i++) {
      for (let j = 0; j < max; j++) {
        arr.push(j);
      }
    }
    return arr;
  };

  const hoursArray = createInfiniteArray(24);
  const minutesArray = createInfiniteArray(60);
  const secondsArray = createInfiniteArray(60);

  // Calcular índice central para cada array
  const getMiddleIndex = (value: number, max: number) => {
    const middleRepeat = Math.floor(REPEAT_COUNT / 2);
    return middleRepeat * max + value;
  };

  useEffect(() => {
    if (visible) {
      // Scroll a la posición inicial en el medio del array infinito
      setTimeout(() => {
        const hoursIndex = getMiddleIndex(selectedHours, 24);
        const minutesIndex = getMiddleIndex(selectedMinutes, 60);
        const secondsIndex = getMiddleIndex(selectedSeconds, 60);

        hoursScrollRef.current?.scrollTo({
          y: hoursIndex * ITEM_HEIGHT,
          animated: false,
        });
        minutesScrollRef.current?.scrollTo({
          y: minutesIndex * ITEM_HEIGHT,
          animated: false,
        });
        secondsScrollRef.current?.scrollTo({
          y: secondsIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, [visible]);

  const handleScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
    setter: (value: number) => void,
    maxValue: number,
    type: 'hours' | 'minutes' | 'seconds'
  ) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const value = index % maxValue;

    setter(value);
  };

  const handleMomentumScrollEnd = () => {
    // Haptic feedback suave cuando termina el scroll
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleConfirm = () => {
    const totalSeconds = selectedHours * 3600 + selectedMinutes * 60 + selectedSeconds;

    if (totalSeconds === 0) {
      return; // No permitir 0 segundos
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelect(totalSeconds);
    onClose();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };

  const renderPickerColumn = (
    values: number[],
    selectedValue: number,
    setter: (value: number) => void,
    scrollRef: React.RefObject<ScrollView>,
    label: string,
    maxValue: number,
    type: 'hours' | 'minutes' | 'seconds'
  ) => {
    return (
      <View style={styles.pickerColumn}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={(e) => handleScroll(e, setter, maxValue, type)}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT * 2,
          }}
        >
          {values.map((value, index) => (
            <View key={index} style={styles.pickerItem}>
              <Text
                style={[
                  styles.pickerItemText,
                  value === selectedValue && styles.pickerItemTextSelected,
                ]}
              >
                {value.toString().padStart(2, '0')}
              </Text>
            </View>
          ))}
        </ScrollView>
        <Text style={styles.pickerLabel}>{label}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Seleccionar Duración</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <View style={styles.selectionIndicator} />

            <View style={styles.pickersRow}>
              {renderPickerColumn(
                hoursArray,
                selectedHours,
                setSelectedHours,
                hoursScrollRef,
                'horas',
                24,
                'hours'
              )}
              {renderPickerColumn(
                minutesArray,
                selectedMinutes,
                setSelectedMinutes,
                minutesScrollRef,
                'min',
                60,
                'minutes'
              )}
              {renderPickerColumn(
                secondsArray,
                selectedSeconds,
                setSelectedSeconds,
                secondsScrollRef,
                'seg',
                60,
                'seconds'
              )}
            </View>
          </View>

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Tiempo seleccionado:</Text>
            <Text style={styles.previewText}>
              {selectedHours > 0 && `${selectedHours}h `}
              {selectedMinutes > 0 && `${selectedMinutes}m `}
              {selectedSeconds > 0 && `${selectedSeconds}s`}
              {selectedHours === 0 && selectedMinutes === 0 && selectedSeconds === 0 && (
                'Selecciona una duración'
              )}
            </Text>
          </View>

          <View style={styles.footer}>
            <Button
              title="Cancelar"
              onPress={handleClose}
              variant="ghost"
              size="medium"
              style={{ flex: 1 }}
            />
            <Button
              title="Confirmar"
              onPress={handleConfirm}
              variant="primary"
              size="medium"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.backgroundCard,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.h3,
  },
  pickerContainer: {
    height: PICKER_HEIGHT,
    position: 'relative',
    marginVertical: theme.spacing.xl,
  },
  selectionIndicator: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    height: ITEM_HEIGHT,
    backgroundColor: theme.colors.primaryLight,
    opacity: 0.2,
    borderRadius: theme.borderRadius.md,
    zIndex: 1,
    pointerEvents: 'none',
  },
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.lg,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: {
    ...theme.typography.h2,
    color: theme.colors.textTertiary,
  },
  pickerItemTextSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  pickerLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  preview: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.md,
  },
  previewLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  previewText: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
