import React, { useState, useLayoutEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { Card, Button, CustomAlert } from "../components";
import { useRoutines, useWorkoutHistory } from "../hooks/useStorage";
import { Ionicons } from "@expo/vector-icons";
import { formatTimeLong, calculateRoutineDuration } from "../utils/helpers";
import { Routine } from "../types";
import { importExportService } from "../services/importExport";
import { getRoutineStats } from "../utils/stats";
import { useCustomAlert } from "../hooks/useCustomAlert";
import { useTranslation } from "react-i18next";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";

type Props = NativeStackScreenProps<RootStackParamList, "RoutinesList">;

export default function RoutinesListScreen({ navigation }: Props) {
  const { routines, loading, deleteRoutine, reorderRoutines, refresh } =
    useRoutines();
  const { history } = useWorkoutHistory();
  const [refreshing, setRefreshing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedRoutines, setSelectedRoutines] = useState<Set<string>>(
    new Set(),
  );
  const [localRoutines, setLocalRoutines] = useState<Routine[]>([]);
  const insets = useSafeAreaInsets();
  const {
    alertConfig,
    visible: alertVisible,
    showAlert,
    hideAlert,
  } = useCustomAlert();
  const { t } = useTranslation();

  // Sincronizar localRoutines con routines cuando cambien (pero no durante drag)
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    if (!isDragging) {
      setLocalRoutines(routines);
    }
  }, [routines, isDragging]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDragEnd = async ({ data }: { data: Routine[] }) => {
    // Actualizar inmediatamente el estado local para evitar flash
    setLocalRoutines(data);
    setIsDragging(false);

    // Guardar en segundo plano sin esperar
    reorderRoutines(data).catch((error) => {
      console.error("Error reordenando rutinas:", error);
      // Si hay error, revertir al orden original
      setLocalRoutines(routines);
    });
  };

  const handleDragBegin = () => {
    setIsDragging(true);
  };

  const handleDeleteRoutine = (routine: Routine) => {
    showAlert(
      t("routines.deleteRoutine"),
      `${t("routines.deleteConfirm")} "${routine.name}"?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => deleteRoutine(routine.id),
        },
      ],
    );
  };

  const handleStartRoutine = (routine: Routine) => {
    navigation.navigate("ExecuteRoutine", { routine });
  };

  const handleViewRoutine = (routine: Routine) => {
    navigation.navigate("ViewRoutine", { routine });
  };

  const handleEditRoutine = (routine: Routine) => {
    navigation.navigate("CreateRoutine", { routine });
  };

  const handleExportPress = () => {
    if (routines.length === 0) {
      showAlert(
        t("importExport.noData"),
        t("importExport.noData"),
        [],
        "information-circle",
      );
      return;
    }
    setShowExportModal(true);
  };

  const handleExportAll = async () => {
    setShowExportModal(false);
    try {
      await importExportService.exportRoutines(routines);
      showAlert(
        t("importExport.exportSuccess"),
        t("importExport.exportSuccess"),
        [],
        "checkmark-circle",
      );
    } catch (error) {
      console.error("Error al exportar rutinas:", error);
      const errorMessage =
        error instanceof Error ? error.message : t("errors.generic");
      showAlert(
        t("importExport.exportError"),
        `${t("importExport.exportError")}: ${errorMessage}`,
        [],
        "close-circle",
        theme.colors.error,
      );
    }
  };

  const handleExportSelected = async () => {
    if (selectedRoutines.size === 0) {
      showAlert(
        t("importExport.noData"),
        t("importExport.noData"),
        [],
        "information-circle",
      );
      return;
    }

    setShowExportModal(false);
    try {
      const routinesToExport = routines.filter((r) =>
        selectedRoutines.has(r.id),
      );
      await importExportService.exportRoutines(routinesToExport);
      showAlert(
        t("importExport.exportSuccess"),
        t("importExport.exportSuccess"),
        [],
        "checkmark-circle",
      );
      setSelectedRoutines(new Set());
    } catch (error) {
      console.error("Error al exportar rutinas seleccionadas:", error);
      const errorMessage =
        error instanceof Error ? error.message : t("errors.generic");
      showAlert(
        t("importExport.exportError"),
        `${t("importExport.exportError")}: ${errorMessage}`,
        [],
        "close-circle",
        theme.colors.error,
      );
    }
  };

  const handleImport = async () => {
    try {
      const result = await importExportService.importRoutines();
      if (result.success) {
        showAlert(
          t("importExport.importSuccess"),
          result.message,
          [],
          "checkmark-circle",
        );
        await refresh();
      } else {
        const message =
          result.message === "Importación cancelada"
            ? t("importExport.importCanceled")
            : result.message;
        showAlert(t("common.info"), message, [], "information-circle");
      }
    } catch (error) {
      showAlert(
        t("importExport.importError"),
        t("importExport.importError"),
        [],
        "close-circle",
        theme.colors.error,
      );
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
    setSelectedRoutines(new Set(routines.map((r) => r.id)));
  };

  const deselectAllRoutines = () => {
    setSelectedRoutines(new Set());
  };

  // Refrescar cuando la pantalla recupera el foco (vuelve de editar)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Agregar botones de import/export en el header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View
          style={{
            flexDirection: "row",
            gap: theme.spacing.sm,
            marginRight: theme.spacing.sm,
          }}
        >
          <TouchableOpacity
            onPress={handleImport}
            style={{ padding: theme.spacing.xs }}
          >
            <Ionicons
              name="cloud-download-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleExportPress}
            style={{ padding: theme.spacing.xs }}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, routines]);

  const renderRoutineItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Routine>) => {
      const totalDuration = calculateRoutineDuration(item.blocks);
      const totalActivities = item.blocks.reduce(
        (sum, block) => sum + block.activities.length * block.repetitions,
        0,
      );
      const stats = getRoutineStats(item.id, history);

      return (
        <ScaleDecorator>
          <Card
            style={[styles.routineCard, isActive && styles.routineCardDragging]}
          >
            <View style={styles.routineHeader}>
              <TouchableOpacity
                onLongPress={drag}
                style={styles.dragHandle}
                delayLongPress={150}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="reorder-three"
                  size={28}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              <View style={styles.routineInfo}>
                <View style={styles.routineNameRow}>
                  <Text style={styles.routineName}>{item.name}</Text>
                  {stats.bestTime && (
                    <View style={styles.bestTimeBadge}>
                      <Ionicons
                        name="trophy"
                        size={14}
                        color={theme.colors.warning}
                      />
                      <Text style={styles.bestTimeText}>
                        {formatTimeLong(stats.bestTime)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.statText}>
                      {totalDuration > 0
                        ? formatTimeLong(totalDuration)
                        : t("routines.variable")}
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons
                      name="list"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.statText}>
                      {t("routines.blocks", { count: item.blocks.length })}
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons
                      name="fitness"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.statText}>
                      {t("routines.activities", { count: totalActivities })}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleDeleteRoutine(item)}
                style={styles.deleteButton}
              >
                <Ionicons
                  name="trash-outline"
                  size={24}
                  color={theme.colors.error}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.iconActionButton}
                onPress={() => handleViewRoutine(item)}
              >
                <Ionicons
                  name="eye-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text style={styles.iconActionText}>Ver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconActionButton}
                onPress={() => handleEditRoutine(item)}
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.iconActionText}>{t("common.edit")}</Text>
              </TouchableOpacity>
              <Button
                title={t("routines.start")}
                onPress={() => handleStartRoutine(item)}
                variant="primary"
                size="small"
                style={styles.startButton}
              />
            </View>
          </Card>
        </ScaleDecorator>
      );
    },
    [history, handleStartRoutine, handleEditRoutine, handleDeleteRoutine, t],
  );

  if (!loading && routines.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="folder-open-outline"
          size={80}
          color={theme.colors.textTertiary}
        />
        <Text style={styles.emptyTitle}>{t("routines.noRoutines")}</Text>
        <Text style={styles.emptyText}>
          {t("routines.noRoutinesDescription")}
        </Text>
        <Button
          title={t("routines.createRoutine")}
          onPress={() => navigation.navigate("CreateRoutine", {})}
          style={styles.createButton}
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <DraggableFlatList
        data={localRoutines}
        renderItem={renderRoutineItem}
        keyExtractor={(item) => item.id}
        onDragBegin={handleDragBegin}
        onDragEnd={handleDragEnd}
        activationDistance={10}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + theme.spacing.lg },
        ]}
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
              <Text style={styles.modalTitle}>
                {t("importExport.exportRoutines")}
              </Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons
                  name="close"
                  size={28}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalDescription}>
                {t("importExport.exportRoutinesSelectDesc")}
              </Text>

              <View style={styles.selectionButtons}>
                <Button
                  title={t("importExport.selectAll")}
                  onPress={selectAllRoutines}
                  variant="ghost"
                  size="small"
                />
                <Button
                  title={t("importExport.deselectAll")}
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
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </View>
                  <Text style={styles.routineSelectName}>{routine.name}</Text>
                  <Text style={styles.routineSelectInfo}>
                    {t("routines.blocks", { count: routine.blocks.length })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title={t("importExport.exportAll")}
                onPress={handleExportAll}
                variant="outline"
                size="medium"
                style={{ flex: 1 }}
              />
              <Button
                title={t("importExport.exportSelected", {
                  count: selectedRoutines.size,
                })}
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
    </GestureHandlerRootView>
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
    backgroundColor: theme.colors.backgroundCard,
  },
  routineCardDragging: {
    opacity: 0.95,
    elevation: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    backgroundColor: theme.colors.backgroundCard,
  },
  routineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  dragHandle: {
    paddingRight: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.xs,
    justifyContent: "center",
  },
  routineInfo: {
    flex: 1,
  },
  routineNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    flexWrap: "wrap",
  },
  routineName: {
    ...theme.typography.h3,
  },
  bestTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: theme.colors.warning + "20",
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.warning + "40",
  },
  bestTimeText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "center",
  },
  iconActionButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.md,
    minWidth: 60,
    gap: 4,
  },
  iconActionText: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  startButton: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  emptyTitle: {
    ...theme.typography.h2,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  createButton: {
    minWidth: 200,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  routineSelectItem: {
    flexDirection: "row",
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
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
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
