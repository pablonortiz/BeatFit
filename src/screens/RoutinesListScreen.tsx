import React, { useState, useLayoutEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { Card, Button, CustomAlert } from '../components';
import { useRoutines, useWorkoutHistory } from '../hooks/useStorage';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeLong, calculateRoutineDuration } from '../utils/helpers';
import { Routine } from '../types';
import { importExportService } from '../services/importExport';
import { getRoutineStats } from '../utils/stats';
import { useCustomAlert } from '../hooks/useCustomAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutinesList'>;

export default function RoutinesListScreen({ navigation }: Props) {
  const { routines, loading, deleteRoutine, refresh } = useRoutines();
  const { history } = useWorkoutHistory();
  const [refreshing, setRefreshing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedRoutines, setSelectedRoutines] = useState<Set<string>>(new Set());
  const insets = useSafeAreaInsets();
  const { alertConfig, visible: alertVisible, showAlert, hideAlert } = useCustomAlert();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDeleteRoutine = (routine: Routine) => {
    showAlert(
      'Eliminar Rutina',
      `¿Estás seguro que deseas eliminar "${routine.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteRoutine(routine.id),
        },
      ]
    );
  };

  const handleStartRoutine = (routine: Routine) => {
    navigation.navigate('ExecuteRoutine', { routine, mode: 'full' });
  };

  const handleEditRoutine = (routine: Routine) => {
    navigation.navigate('CreateRoutine', { mode: 'full', routine });
  };

  const handleExportPress = () => {
    if (routines.length === 0) {
      showAlert('Sin rutinas', 'No hay rutinas para exportar', [], 'information-circle');
      return;
    }
    setShowExportModal(true);
  };

  const handleExportAll = async () => {
    setShowExportModal(false);
    try {
      await importExportService.exportRoutines(routines);
      showAlert('Éxito', 'Rutinas exportadas correctamente', [], 'checkmark-circle');
    } catch (error) {
      console.error('Error al exportar rutinas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showAlert('Error', `No se pudieron exportar las rutinas: ${errorMessage}`, [], 'close-circle', theme.colors.error);
    }
  };

  const handleExportSelected = async () => {
    if (selectedRoutines.size === 0) {
      showAlert('Sin selección', 'Selecciona al menos una rutina para exportar', [], 'information-circle');
      return;
    }

    setShowExportModal(false);
    try {
      const routinesToExport = routines.filter(r => selectedRoutines.has(r.id));
      await importExportService.exportRoutines(routinesToExport);
      showAlert('Éxito', `${routinesToExport.length} rutina${routinesToExport.length !== 1 ? 's' : ''} exportada${routinesToExport.length !== 1 ? 's' : ''} correctamente`, [], 'checkmark-circle');
      setSelectedRoutines(new Set());
    } catch (error) {
      console.error('Error al exportar rutinas seleccionadas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showAlert('Error', `No se pudieron exportar las rutinas: ${errorMessage}`, [], 'close-circle', theme.colors.error);
    }
  };

  const handleImport = async () => {
    try {
      const result = await importExportService.importRoutines();
      if (result.success) {
        showAlert('Éxito', result.message, [], 'checkmark-circle');
        await refresh();
      } else {
        showAlert('Información', result.message, [], 'information-circle');
      }
    } catch (error) {
      showAlert('Error', 'No se pudieron importar las rutinas', [], 'close-circle', theme.colors.error);
    }
  };

  const toggleRoutineSelection = (id: string) => {
    const newSelection = new Set(selectedRoutines);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRoutines(newSelection);
  };

  const selectAllRoutines = () => {
    setSelectedRoutines(new Set(routines.map(r => r.id)));
  };

  const deselectAllRoutines = () => {
    setSelectedRoutines(new Set());
  };

  // Refrescar cuando la pantalla recupera el foco (vuelve de editar)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Agregar botones de import/export en el header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginRight: theme.spacing.sm }}>
          <TouchableOpacity onPress={handleImport} style={{ padding: theme.spacing.xs }}>
            <Ionicons name="cloud-download-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportPress} style={{ padding: theme.spacing.xs }}>
            <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, routines]);

  const renderRoutineItem = ({ item }: { item: Routine }) => {
    const totalDuration = calculateRoutineDuration(item.blocks);
    const totalActivities = item.blocks.reduce(
      (sum, block) => sum + block.activities.length * block.repetitions,
      0
    );
    const stats = getRoutineStats(item.id, history);

    return (
      <Card style={styles.routineCard}>
        <View style={styles.routineHeader}>
          <View style={styles.routineInfo}>
            <View style={styles.routineNameRow}>
              <Text style={styles.routineName}>{item.name}</Text>
              {stats.bestTime && (
                <View style={styles.bestTimeBadge}>
                  <Ionicons name="trophy" size={14} color={theme.colors.warning} />
                  <Text style={styles.bestTimeText}>{formatTimeLong(stats.bestTime)}</Text>
                </View>
              )}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>
                  {totalDuration > 0 ? formatTimeLong(totalDuration) : 'Variable'}
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="list" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>{item.blocks.length} bloques</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="fitness" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>{totalActivities} ejercicios</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteRoutine(item)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <Button
            title="Editar"
            onPress={() => handleEditRoutine(item)}
            variant="outline"
            size="small"
            style={styles.actionButton}
          />
          <Button
            title="Comenzar"
            onPress={() => handleStartRoutine(item)}
            variant="primary"
            size="small"
            style={styles.actionButton}
          />
        </View>
      </Card>
    );
  };

  if (!loading && routines.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={80} color={theme.colors.textTertiary} />
        <Text style={styles.emptyTitle}>No hay rutinas guardadas</Text>
        <Text style={styles.emptyText}>
          Crea tu primera rutina para comenzar a entrenar
        </Text>
        <Button
          title="Crear Rutina"
          onPress={() => navigation.navigate('CreateRoutine', { mode: 'full' })}
          style={styles.createButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={routines}
        renderItem={renderRoutineItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + theme.spacing.lg }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Exportar Rutinas</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalDescription}>
                Selecciona las rutinas que deseas exportar o exporta todas
              </Text>

              <View style={styles.selectionButtons}>
                <Button
                  title="Seleccionar Todas"
                  onPress={selectAllRoutines}
                  variant="ghost"
                  size="small"
                />
                <Button
                  title="Deseleccionar"
                  onPress={deselectAllRoutines}
                  variant="ghost"
                  size="small"
                />
              </View>

              {routines.map((routine) => (
                <TouchableOpacity
                  key={routine.id}
                  style={styles.routineSelectItem}
                  onPress={() => toggleRoutineSelection(routine.id)}
                >
                  <View style={styles.checkbox}>
                    {selectedRoutines.has(routine.id) && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                    )}
                  </View>
                  <Text style={styles.routineSelectName}>{routine.name}</Text>
                  <Text style={styles.routineSelectInfo}>
                    {routine.blocks.length} bloques
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Exportar Todas"
                onPress={handleExportAll}
                variant="outline"
                size="medium"
                style={{ flex: 1 }}
              />
              <Button
                title={`Exportar ${selectedRoutines.size > 0 ? `(${selectedRoutines.size})` : 'Seleccionadas'}`}
                onPress={handleExportSelected}
                variant="primary"
                size="medium"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      {alertConfig && (
        <CustomAlert
          visible={alertVisible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          icon={alertConfig.icon}
          iconColor={alertConfig.iconColor}
          onDismiss={hideAlert}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: theme.spacing.lg,
  },
  routineCard: {
    marginBottom: theme.spacing.md,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  routineInfo: {
    flex: 1,
  },
  routineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  routineName: {
    ...theme.typography.h3,
  },
  bestTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.warning + '40',
  },
  bestTimeText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  emptyTitle: {
    ...theme.typography.h2,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  createButton: {
    minWidth: 200,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h3,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  selectionButtons: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  routineSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routineSelectName: {
    ...theme.typography.bodyBold,
    flex: 1,
  },
  routineSelectInfo: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
