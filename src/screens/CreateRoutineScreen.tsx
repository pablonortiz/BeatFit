import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { Button, Card } from '../components';
import { AddActivityModal } from '../components/AddActivityModal';
import { Ionicons } from '@expo/vector-icons';
import { Block, Activity, Routine } from '../types';
import { generateId, formatTime } from '../utils/helpers';
import { useRoutines } from '../hooks/useStorage';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRoutine'>;

export default function CreateRoutineScreen({ navigation, route }: Props) {
  const { mode } = route.params;
  const { saveRoutine } = useRoutines();

  const [routineName, setRoutineName] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: generateId(),
      name: 'Bloque 1',
      activities: [],
      repetitions: 1,
    },
  ]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');

  const handleAddBlock = () => {
    const newBlock: Block = {
      id: generateId(),
      name: `Bloque ${blocks.length + 1}`,
      activities: [],
      repetitions: 1,
    };
    setBlocks([...blocks, newBlock]);
  };

  const handleDeleteBlock = (blockId: string) => {
    if (blocks.length === 1) {
      Alert.alert('Error', 'Debe haber al menos un bloque');
      return;
    }

    Alert.alert('Eliminar Bloque', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setBlocks(blocks.filter((b) => b.id !== blockId));
        },
      },
    ]);
  };

  const handleUpdateBlockName = (blockId: string, name: string) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId ? { ...block, name } : block
      )
    );
  };

  const handleUpdateBlockRepetitions = (blockId: string, reps: number) => {
    if (reps < 1) return;
    setBlocks(
      blocks.map((block) =>
        block.id === blockId ? { ...block, repetitions: reps } : block
      )
    );
  };

  const handleAddActivity = (activity: Activity) => {
    setBlocks(
      blocks.map((block) =>
        block.id === selectedBlockId
          ? { ...block, activities: [...block.activities, activity] }
          : block
      )
    );
  };

  const handleDeleteActivity = (blockId: string, activityId: string) => {
    Alert.alert('Eliminar Actividad', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setBlocks(
            blocks.map((block) =>
              block.id === blockId
                ? {
                    ...block,
                    activities: block.activities.filter((a) => a.id !== activityId),
                  }
                : block
            )
          );
        },
      },
    ]);
  };

  const handleSaveRoutine = async () => {
    if (!routineName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para la rutina');
      return;
    }

    const hasActivities = blocks.some((block) => block.activities.length > 0);
    if (!hasActivities) {
      Alert.alert('Error', 'Agrega al menos una actividad a la rutina');
      return;
    }

    const routine: Routine = {
      id: generateId(),
      name: routineName.trim(),
      blocks,
      createdAt: Date.now(),
    };

    await saveRoutine(routine);
    Alert.alert('Éxito', 'Rutina guardada correctamente', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const renderActivity = (activity: Activity, blockId: string) => {
    return (
      <View key={activity.id} style={styles.activityItem}>
        <View style={styles.activityIcon}>
          <Ionicons
            name={activity.icon as any}
            size={24}
            color={
              activity.type === 'rest'
                ? theme.colors.rest
                : theme.colors.exercise
            }
          />
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.activityName}>{activity.name}</Text>
          <Text style={styles.activityDetails}>
            {activity.exerciseType === 'time'
              ? `${formatTime(activity.duration || 0)}`
              : `${activity.reps} reps`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteActivity(blockId, activity.id)}
        >
          <Ionicons name="close-circle" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderBlock = (block: Block, index: number) => {
    return (
      <Card key={block.id} style={styles.blockCard}>
        <View style={styles.blockHeader}>
          <TextInput
            style={styles.blockNameInput}
            value={block.name}
            onChangeText={(text) => handleUpdateBlockName(block.id, text)}
            placeholder="Nombre del bloque"
            placeholderTextColor={theme.colors.textTertiary}
          />
          {blocks.length > 1 && (
            <TouchableOpacity onPress={() => handleDeleteBlock(block.id)}>
              <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.repetitionsRow}>
          <Text style={styles.label}>Repeticiones del bloque:</Text>
          <View style={styles.counter}>
            <TouchableOpacity
              onPress={() =>
                handleUpdateBlockRepetitions(block.id, block.repetitions - 1)
              }
            >
              <Ionicons name="remove-circle" size={32} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.counterText}>{block.repetitions}</Text>
            <TouchableOpacity
              onPress={() =>
                handleUpdateBlockRepetitions(block.id, block.repetitions + 1)
              }
            >
              <Ionicons name="add-circle" size={32} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {block.activities.length > 0 && (
          <View style={styles.activitiesList}>
            {block.activities.map((activity) =>
              renderActivity(activity, block.id)
            )}
          </View>
        )}

        <Button
          title="+ Agregar Actividad"
          onPress={() => {
            setSelectedBlockId(block.id);
            setShowAddActivity(true);
          }}
          variant="outline"
          size="small"
          fullWidth
        />
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.nameSection}>
          <Text style={styles.label}>Nombre de la rutina</Text>
          <TextInput
            style={styles.nameInput}
            value={routineName}
            onChangeText={setRoutineName}
            placeholder="Mi Rutina de Entrenamiento"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        {blocks.map((block, index) => renderBlock(block, index))}

        <Button
          title="+ Agregar Bloque"
          onPress={handleAddBlock}
          variant="ghost"
          size="medium"
          fullWidth
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Guardar Rutina"
          onPress={handleSaveRoutine}
          variant="primary"
          size="large"
          fullWidth
        />
      </View>

      <AddActivityModal
        visible={showAddActivity}
        onClose={() => setShowAddActivity(false)}
        onAdd={handleAddActivity}
        blockId={selectedBlockId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  nameSection: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  nameInput: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  blockCard: {
    marginBottom: theme.spacing.lg,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  blockNameInput: {
    flex: 1,
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  repetitionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  counterText: {
    ...theme.typography.h3,
    minWidth: 40,
    textAlign: 'center',
  },
  activitiesList: {
    marginBottom: theme.spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    ...theme.typography.bodyBold,
    marginBottom: theme.spacing.xs,
  },
  activityDetails: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
