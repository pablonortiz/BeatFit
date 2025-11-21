import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { Button, Card, CustomAlert, EditActivityModal } from "../components";
import { AddActivityModal } from "../components/AddActivityModal";
import { Ionicons } from "@expo/vector-icons";
import { Block, Activity, Routine, BlockType } from "../types";
import { generateId, formatTime } from "../utils/helpers";
import { useRoutines } from "../hooks/useStorage";
import { useCustomAlert } from "../hooks/useCustomAlert";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";

type Props = NativeStackScreenProps<RootStackParamList, "CreateRoutine">;

export default function CreateRoutineScreen({ navigation, route }: Props) {
  const { routine: editingRoutine } = route.params;
  const { saveRoutine, updateRoutine } = useRoutines();
  const insets = useSafeAreaInsets();
  const isEditMode = !!editingRoutine;
  const { t } = useTranslation();
  const {
    alertConfig,
    visible: alertVisible,
    showAlert,
    hideAlert,
  } = useCustomAlert();

  const [routineName, setRoutineName] = useState(editingRoutine?.name || "");
  const [blocks, setBlocks] = useState<Block[]>(
    editingRoutine?.blocks || [
      {
        id: generateId(),
        name: t("createRoutine.block") + " 1",
        activities: [],
        repetitions: 1,
        type: "normal",
      },
    ],
  );
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editingActivityBlockId, setEditingActivityBlockId] =
    useState<string>("");

  // Verificar si ya existen bloques especiales
  const hasWarmupBlock = useMemo(
    () => blocks.some((b) => b.type === "warmup"),
    [blocks],
  );
  const hasCooldownBlock = useMemo(
    () => blocks.some((b) => b.type === "cooldown"),
    [blocks],
  );

  const handleAddBlock = useCallback(() => {
    setBlocks((prevBlocks) => {
      // Contar solo bloques normales para el índice
      const normalBlocks = prevBlocks.filter(
        (b) => b.type === "normal" || !b.type,
      );
      const newBlock: Block = {
        id: generateId(),
        name: `${t("createRoutine.block")} ${normalBlocks.length + 1}`,
        activities: [],
        repetitions: 1,
        type: "normal",
      };

      // Insertar antes del bloque de elongación si existe
      const cooldownIndex = prevBlocks.findIndex((b) => b.type === "cooldown");
      if (cooldownIndex !== -1) {
        const newBlocks = [...prevBlocks];
        newBlocks.splice(cooldownIndex, 0, newBlock);
        return newBlocks;
      }

      return [...prevBlocks, newBlock];
    });
  }, []);

  const handleAddWarmupBlock = useCallback(() => {
    if (hasWarmupBlock) return;

    const warmupBlock: Block = {
      id: generateId(),
      name: t("createRoutine.warmup"),
      activities: [],
      repetitions: 1,
      type: "warmup",
    };

    // Siempre agregar al principio
    setBlocks((prevBlocks) => [warmupBlock, ...prevBlocks]);
  }, [hasWarmupBlock]);

  const handleAddCooldownBlock = useCallback(() => {
    if (hasCooldownBlock) return;

    const cooldownBlock: Block = {
      id: generateId(),
      name: t("createRoutine.cooldown"),
      activities: [],
      repetitions: 1,
      type: "cooldown",
    };

    // Siempre agregar al final
    setBlocks((prevBlocks) => [...prevBlocks, cooldownBlock]);
  }, [hasCooldownBlock]);

  const handleAddRestBlock = useCallback((afterBlockId: string) => {
    const restBlock: Block = {
      id: generateId(),
      name: t("createRoutine.restBetweenBlocks"),
      activities: [],
      repetitions: 1,
      type: "rest-block",
    };

    setBlocks((prevBlocks) => {
      const targetIndex = prevBlocks.findIndex((b) => b.id === afterBlockId);
      if (targetIndex === -1) return prevBlocks;

      const newBlocks = [...prevBlocks];
      // Insertar después del bloque especificado
      newBlocks.splice(targetIndex + 1, 0, restBlock);
      return newBlocks;
    });
  }, []);

  const handleDeleteBlock = (blockId: string) => {
    if (blocks.length === 1) {
      showAlert(
        t("common.error"),
        t("createRoutine.errorAtLeastOneBlock"),
        [],
        "close-circle",
        theme.colors.error,
      );
      return;
    }

    showAlert(
      t("createRoutine.deleteBlock"),
      t("createRoutine.deleteBlockConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            setBlocks(blocks.filter((b) => b.id !== blockId));
          },
        },
      ],
    );
  };

  const handleUpdateBlockName = (blockId: string, name: string) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId ? { ...block, name } : block,
      ),
    );
  };

  const handleUpdateBlockRepetitions = (blockId: string, reps: number) => {
    if (reps < 1) return;
    setBlocks(
      blocks.map((block) =>
        block.id === blockId ? { ...block, repetitions: reps } : block,
      ),
    );
  };

  const handleUpdateBlockRestBetweenReps = (blockId: string, rest: number) => {
    if (rest < 0) return;
    setBlocks(
      blocks.map((block) =>
        block.id === blockId
          ? { ...block, restBetweenReps: rest > 0 ? rest : undefined }
          : block,
      ),
    );
  };

  const handleAddActivity = (activity: Activity) => {
    setBlocks(
      blocks.map((block) =>
        block.id === selectedBlockId
          ? { ...block, activities: [...block.activities, activity] }
          : block,
      ),
    );
  };

  const handleDeleteActivity = (blockId: string, activityId: string) => {
    showAlert(
      t("createRoutine.deleteActivity"),
      t("createRoutine.deleteActivityConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            setBlocks(
              blocks.map((block) =>
                block.id === blockId
                  ? {
                      ...block,
                      activities: block.activities.filter(
                        (a) => a.id !== activityId,
                      ),
                    }
                  : block,
              ),
            );
          },
        },
      ],
    );
  };

  const handleDuplicateActivity = (blockId: string, activity: Activity) => {
    const duplicatedActivity: Activity = {
      ...activity,
      id: generateId(),
    };

    setBlocks(
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              activities: [
                ...block.activities.slice(
                  0,
                  block.activities.findIndex((a) => a.id === activity.id) + 1,
                ),
                duplicatedActivity,
                ...block.activities.slice(
                  block.activities.findIndex((a) => a.id === activity.id) + 1,
                ),
              ],
            }
          : block,
      ),
    );
  };

  const handleDuplicateBlock = (blockId: string) => {
    const blockToDuplicate = blocks.find((b) => b.id === blockId);
    if (!blockToDuplicate) return;

    // No permitir duplicar bloques especiales
    if (
      blockToDuplicate.type === "warmup" ||
      blockToDuplicate.type === "cooldown" ||
      blockToDuplicate.type === "rest-block"
    ) {
      return;
    }

    // Duplicar actividades con nuevos IDs
    const duplicatedActivities = blockToDuplicate.activities.map(
      (activity) => ({
        ...activity,
        id: generateId(),
      }),
    );

    const duplicatedBlock: Block = {
      ...blockToDuplicate,
      id: generateId(),
      name: `${blockToDuplicate.name} (copia)`,
      activities: duplicatedActivities,
    };

    setBlocks((prevBlocks) => {
      const targetIndex = prevBlocks.findIndex((b) => b.id === blockId);
      if (targetIndex === -1) return prevBlocks;

      const newBlocks = [...prevBlocks];
      // Insertar después del bloque original
      newBlocks.splice(targetIndex + 1, 0, duplicatedBlock);
      return newBlocks;
    });
  };

  const handleEditActivity = (blockId: string, activity: Activity) => {
    setEditingActivityBlockId(blockId);
    setEditingActivity(activity);
  };

  const handleSaveEditedActivity = (updatedActivity: Activity) => {
    setBlocks(
      blocks.map((block) =>
        block.id === editingActivityBlockId
          ? {
              ...block,
              activities: block.activities.map((a) =>
                a.id === updatedActivity.id ? updatedActivity : a,
              ),
            }
          : block,
      ),
    );
    setEditingActivity(null);
    setEditingActivityBlockId("");
  };

  const handleReorderActivities = (
    blockId: string,
    newActivities: Activity[],
  ) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId ? { ...block, activities: newActivities } : block,
      ),
    );
  };

  const handleReorderBlocks = (newNormalBlocks: Block[]) => {
    // Crear un mapa de qué bloques de descanso vienen después de cada bloque
    const restBlocksMap = new Map<string, Block[]>();

    blocks.forEach((block, index) => {
      if (block.type === "rest-block" && index > 0) {
        const previousBlock = blocks[index - 1];
        if (previousBlock && previousBlock.type === "normal") {
          if (!restBlocksMap.has(previousBlock.id)) {
            restBlocksMap.set(previousBlock.id, []);
          }
          restBlocksMap.get(previousBlock.id)?.push(block);
        }
      }
    });

    // Renombrar bloques normales que siguen el patrón "Bloque X"
    const renamedNormalBlocks = newNormalBlocks.map((block, index) => {
      if (/^Bloque \d+$/.test(block.name || "")) {
        return {
          ...block,
          name: `Bloque ${index + 1}`,
        };
      }
      return block;
    });

    // Intercalar bloques normales con sus descansos asociados
    const normalBlocksWithRests: Block[] = [];
    renamedNormalBlocks.forEach((block) => {
      normalBlocksWithRests.push(block);
      const associatedRests = restBlocksMap.get(block.id);
      if (associatedRests) {
        normalBlocksWithRests.push(...associatedRests);
      }
    });

    // Reconstruir array con el orden correcto: warmup, normales con descansos, cooldown
    const orderedBlocks = [
      ...(warmupBlock ? [warmupBlock] : []),
      ...normalBlocksWithRests,
      ...(cooldownBlock ? [cooldownBlock] : []),
    ];

    setBlocks(orderedBlocks);
  };

  const handleSaveRoutine = async () => {
    if (!routineName.trim()) {
      showAlert(
        t("common.error"),
        t("createRoutine.errorNameRequired"),
        [],
        "close-circle",
        theme.colors.error,
      );
      return;
    }

    // Validar que todos los bloques tengan al menos una actividad
    const emptyBlocks = blocks.filter((block) => block.activities.length === 0);
    if (emptyBlocks.length > 0) {
      const blockNames = emptyBlocks.map((b) => `"${b.name}"`).join(", ");
      showAlert(
        t("createRoutine.errorEmptyBlocks"),
        t("createRoutine.errorEmptyBlocksMessage"),
        [],
        "alert-circle",
        theme.colors.warning,
      );
      return;
    }

    const hasActivities = blocks.some((block) => block.activities.length > 0);
    if (!hasActivities) {
      showAlert(
        t("common.error"),
        t("createRoutine.errorNoActivities"),
        [],
        "close-circle",
        theme.colors.error,
      );
      return;
    }

    if (isEditMode && editingRoutine) {
      // Modo edición: actualizar rutina existente
      const updatedRoutine: Routine = {
        ...editingRoutine,
        name: routineName.trim(),
        blocks,
      };

      await updateRoutine(updatedRoutine);
      setHasUnsavedChanges(false);
      showAlert(
        t("common.success"),
        t("createRoutine.successUpdated"),
        [
          {
            text: t("common.ok"),
            onPress: () => navigation.goBack(),
          },
        ],
        "checkmark-circle",
      );
    } else {
      // Modo creación: crear nueva rutina
      const routine: Routine = {
        id: generateId(),
        name: routineName.trim(),
        blocks,
        createdAt: Date.now(),
      };

      await saveRoutine(routine);
      setHasUnsavedChanges(false);
      showAlert(
        t("common.success"),
        t("createRoutine.successSaved"),
        [
          {
            text: t("common.ok"),
            onPress: () => navigation.goBack(),
          },
        ],
        "checkmark-circle",
      );
    }
  };

  // Detectar si hay cambios
  useEffect(() => {
    const hasName = routineName.trim().length > 0;
    const hasActivities = blocks.some((block) => block.activities.length > 0);
    setHasUnsavedChanges(hasName || hasActivities);
  }, [routineName, blocks]);

  // Manejar navegación hacia atrás (botón de header)
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (!hasUnsavedChanges) {
        // Si no hay cambios, dejar ir
        return;
      }

      // Prevenir la acción por defecto
      e.preventDefault();

      // Mostrar alerta de confirmación
      showAlert(
        t("createRoutine.discardChanges"),
        t("createRoutine.discardMessage"),
        [
          { text: t("common.cancel"), style: "cancel", onPress: () => null },
          {
            text: t("common.discard"),
            style: "destructive",
            onPress: () => {
              setHasUnsavedChanges(false);
              // Ejecutar navegación después de actualizar el estado
              setTimeout(() => {
                navigation.dispatch(e.data.action);
              }, 100);
            },
          },
        ],
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  // Manejar botón físico de Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!hasUnsavedChanges) {
          return false; // Permitir comportamiento por defecto
        }

        // Mostrar alerta de confirmación
        showAlert(
          t("createRoutine.discardChanges"),
          t("createRoutine.discardMessage"),
          [
            { text: t("common.cancel"), style: "cancel", onPress: () => null },
            {
              text: t("common.discard"),
              style: "destructive",
              onPress: () => {
                setHasUnsavedChanges(false);
                // Ejecutar navegación después de actualizar el estado
                setTimeout(() => {
                  navigation.goBack();
                }, 100);
              },
            },
          ],
        );

        return true; // Prevenir comportamiento por defecto
      },
    );

    return () => backHandler.remove();
  }, [hasUnsavedChanges, navigation]);

  const renderActivity = (
    params: RenderItemParams<Activity>,
    blockId: string,
  ) => {
    const { item: activity, drag, isActive } = params;

    return (
      <ScaleDecorator>
        <View
          style={[styles.activityItem, isActive && styles.activityItemDragging]}
        >
          <TouchableOpacity onPressIn={drag} style={styles.activityDragHandle}>
            <Ionicons
              name="reorder-two"
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={styles.activityIcon}>
            <Ionicons
              name={activity.icon as any}
              size={24}
              color={
                activity.type === "rest"
                  ? theme.colors.rest
                  : theme.colors.exercise
              }
            />
          </View>

          <View style={styles.activityInfo}>
            <Text style={styles.activityName} numberOfLines={1}>
              {activity.name}
            </Text>
            <Text style={styles.activityDetails}>
              {activity.exerciseType === "time"
                ? `${formatTime(activity.duration || 0)}`
                : `${activity.reps} reps`}
            </Text>
          </View>

          <View style={styles.activityActions}>
            <TouchableOpacity
              onPress={() => handleDuplicateActivity(blockId, activity)}
              style={styles.activityActionButton}
            >
              <Ionicons
                name="copy-outline"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleEditActivity(blockId, activity)}
              style={styles.activityActionButton}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={theme.colors.accent}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteActivity(blockId, activity.id)}
              style={styles.activityActionButton}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScaleDecorator>
    );
  };

  const renderBlock = (params: RenderItemParams<Block>) => {
    const { item: block, drag, isActive } = params;
    const isBlockEmpty = block.activities.length === 0;

    // Encontrar bloques de descanso que vienen después de este bloque
    const blockIndex = blocks.findIndex((b) => b.id === block.id);
    const restBlocksAfter: Block[] = [];

    if (blockIndex !== -1) {
      for (let i = blockIndex + 1; i < blocks.length; i++) {
        if (blocks[i].type === "rest-block") {
          restBlocksAfter.push(blocks[i]);
        } else {
          break; // Detener al encontrar un bloque que no es rest-block
        }
      }
    }

    const cardStyle = [
      styles.blockCard,
      isActive ? styles.blockCardDragging : null,
    ];

    return (
      <>
        <ScaleDecorator>
          <Card style={cardStyle}>
            <View style={styles.blockHeader}>
              <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
                <Ionicons
                  name="menu"
                  size={28}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
              <TextInput
                style={styles.blockNameInput}
                value={block.name}
                onChangeText={(text) => handleUpdateBlockName(block.id, text)}
                placeholder={t("createRoutine.blockNamePlaceholder")}
                placeholderTextColor={theme.colors.textTertiary}
              />
              <View style={styles.blockHeaderActions}>
                {block.type === "normal" && (
                  <TouchableOpacity
                    onPress={() => handleDuplicateBlock(block.id)}
                    style={styles.blockActionButton}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={22}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDeleteBlock(block.id)}>
                  <Ionicons
                    name="trash-outline"
                    size={24}
                    color={theme.colors.error}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Indicador de bloque vacío */}
            {isBlockEmpty && (
              <View style={styles.emptyBlockIndicator}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={theme.colors.warning}
                />
                <Text style={styles.emptyBlockText}>
                  {t("createRoutine.blockNeedsActivity")}
                </Text>
              </View>
            )}

            {/* Repeticiones */}
            <View style={styles.repetitionsRow}>
              <Text style={styles.label}>
                {t("createRoutine.blockRepetitions")}
              </Text>
              <View style={styles.counter}>
                <TouchableOpacity
                  onPress={() =>
                    handleUpdateBlockRepetitions(
                      block.id,
                      block.repetitions - 1,
                    )
                  }
                >
                  <Ionicons
                    name="remove-circle"
                    size={32}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
                <Text style={styles.counterText}>{block.repetitions}</Text>
                <TouchableOpacity
                  onPress={() =>
                    handleUpdateBlockRepetitions(
                      block.id,
                      block.repetitions + 1,
                    )
                  }
                >
                  <Ionicons
                    name="add-circle"
                    size={32}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Descanso entre repeticiones (solo si hay más de 1 repetición) */}
            {block.repetitions > 1 && (
              <View style={styles.restBetweenRepsSection}>
                <View style={styles.restBetweenRepsHeader}>
                  <Ionicons
                    name="pause-circle-outline"
                    size={20}
                    color={theme.colors.rest}
                  />
                  <Text style={styles.restBetweenRepsLabel}>
                    Descanso entre repeticiones (opcional)
                  </Text>
                </View>
                <View style={styles.counter}>
                  <TouchableOpacity
                    onPress={() => {
                      const currentRest = block.restBetweenReps || 0;
                      handleUpdateBlockRestBetweenReps(
                        block.id,
                        Math.max(0, currentRest - 10),
                      );
                    }}
                  >
                    <Ionicons
                      name="remove-circle"
                      size={32}
                      color={theme.colors.rest}
                    />
                  </TouchableOpacity>
                  <View style={styles.restTimeDisplay}>
                    <Text style={styles.restTimeText}>
                      {block.restBetweenReps
                        ? `${block.restBetweenReps}s`
                        : "Sin descanso"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const currentRest = block.restBetweenReps || 0;
                      handleUpdateBlockRestBetweenReps(block.id, currentRest + 10);
                    }}
                  >
                    <Ionicons
                      name="add-circle"
                      size={32}
                      color={theme.colors.rest}
                    />
                  </TouchableOpacity>
                </View>
                {block.restBetweenReps && block.restBetweenReps > 0 && (
                  <Text style={styles.restBetweenRepsHint}>
                    Se agregará un descanso de {block.restBetweenReps} segundos entre
                    cada repetición de este bloque
                  </Text>
                )}
              </View>
            )}

            {/* Lista de actividades con drag and drop */}
            {block.activities.length > 0 && (
              <View style={styles.activitiesList}>
                <DraggableFlatList
                  data={block.activities}
                  renderItem={(params) => renderActivity(params, block.id)}
                  keyExtractor={(item) => item.id}
                  onDragEnd={({ data }) =>
                    handleReorderActivities(block.id, data)
                  }
                  containerStyle={{ flex: 1 }}
                />
              </View>
            )}

            <Button
              title={t("createRoutine.addActivity")}
              onPress={() => {
                setSelectedBlockId(block.id);
                setShowAddActivity(true);
              }}
              variant="outline"
              size="small"
              fullWidth
            />
          </Card>

          {/* Botón para agregar descanso entre bloques (solo si no hay uno ya) */}
          {restBlocksAfter.length === 0 && (
            <TouchableOpacity
              style={styles.addRestBlockButton}
              onPress={() => handleAddRestBlock(block.id)}
            >
              <View style={styles.addRestBlockLine} />
              <View style={styles.addRestBlockContent}>
                <Ionicons
                  name="add-circle"
                  size={20}
                  color={theme.colors.rest}
                />
                <Text style={styles.addRestBlockText}>
                  {t("createRoutine.addRestBlock")}
                </Text>
              </View>
              <View style={styles.addRestBlockLine} />
            </TouchableOpacity>
          )}
        </ScaleDecorator>

        {/* Renderizar bloques de descanso que vienen después */}
        {restBlocksAfter.map((restBlock) => renderNonDraggableBlock(restBlock))}
      </>
    );
  };

  const renderNonDraggableBlock = (block: Block) => {
    const isBlockEmpty = block.activities.length === 0;
    const blockColor =
      block.type === "warmup"
        ? theme.colors.info
        : block.type === "cooldown"
        ? theme.colors.success
        : theme.colors.rest; // rest-block

    const blockIcon =
      block.type === "warmup"
        ? "flame"
        : block.type === "cooldown"
        ? "leaf"
        : "pause-circle"; // rest-block

    const cardStyle = [
      styles.blockCard,
      { borderLeftWidth: 4, borderLeftColor: blockColor },
    ];

    return (
      <Card key={block.id} style={cardStyle}>
        <View style={styles.blockHeader}>
          <View style={styles.specialBlockIcon}>
            <Ionicons name={blockIcon as any} size={24} color={blockColor} />
          </View>
          <TextInput
            style={[
              styles.blockNameInput,
              { color: blockColor, fontWeight: "600" },
            ]}
            value={block.name}
            onChangeText={(text) => handleUpdateBlockName(block.id, text)}
            placeholder="Nombre del bloque"
            placeholderTextColor={theme.colors.textTertiary}
          />
          <TouchableOpacity onPress={() => handleDeleteBlock(block.id)}>
            <Ionicons
              name="trash-outline"
              size={24}
              color={theme.colors.error}
            />
          </TouchableOpacity>
        </View>

        {/* Indicador de bloque vacío */}
        {isBlockEmpty && (
          <View style={styles.emptyBlockIndicator}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={theme.colors.warning}
            />
            <Text style={styles.emptyBlockText}>
              Este bloque necesita al menos una actividad
            </Text>
          </View>
        )}

        {/* Repeticiones (solo para calentamiento, elongación y descansos entre bloques siempre son 1) */}
        {block.type !== "cooldown" && block.type !== "rest-block" && (
          <View style={styles.repetitionsRow}>
            <Text style={styles.label}>Repeticiones del bloque:</Text>
            <View style={styles.counter}>
              <TouchableOpacity
                onPress={() =>
                  handleUpdateBlockRepetitions(block.id, block.repetitions - 1)
                }
              >
                <Ionicons
                  name="remove-circle"
                  size={32}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
              <Text style={styles.counterText}>{block.repetitions}</Text>
              <TouchableOpacity
                onPress={() =>
                  handleUpdateBlockRepetitions(block.id, block.repetitions + 1)
                }
              >
                <Ionicons
                  name="add-circle"
                  size={32}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Lista de actividades con drag and drop */}
        {block.activities.length > 0 && (
          <View style={styles.activitiesList}>
            <DraggableFlatList
              data={block.activities}
              renderItem={(params) => renderActivity(params, block.id)}
              keyExtractor={(item) => item.id}
              onDragEnd={({ data }) => handleReorderActivities(block.id, data)}
              containerStyle={{ flex: 1 }}
            />
          </View>
        )}

        <Button
          title={t("createRoutine.addActivity")}
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

  // Separar bloques por tipo
  const warmupBlock = blocks.find((b) => b.type === "warmup");
  const cooldownBlock = blocks.find((b) => b.type === "cooldown");
  const restBlocks = blocks.filter((b) => b.type === "rest-block");
  const normalBlocks = blocks.filter(
    (b) =>
      b.type !== "warmup" && b.type !== "cooldown" && b.type !== "rest-block",
  );

  const renderHeader = useMemo(
    () => (
      <>
        <View style={styles.nameSection}>
          <Text style={styles.label}>{t("createRoutine.routineName")}</Text>
          <TextInput
            style={styles.nameInput}
            value={routineName}
            onChangeText={setRoutineName}
            placeholder={t("createRoutine.routineNamePlaceholder")}
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        {/* Botones de bloques especiales */}
        <View style={styles.specialBlocksSection}>
          <Text style={styles.specialBlocksTitle}>
            {t("createRoutine.specialBlocksOptional")}
          </Text>
          <View style={styles.specialBlocksButtons}>
            <TouchableOpacity
              style={[
                styles.specialBlockButton,
                hasWarmupBlock && styles.specialBlockButtonActive,
                { borderColor: theme.colors.info },
              ]}
              onPress={handleAddWarmupBlock}
              disabled={hasWarmupBlock}
            >
              <Ionicons
                name="flame"
                size={24}
                color={
                  hasWarmupBlock
                    ? theme.colors.info
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.specialBlockButtonText,
                  hasWarmupBlock && {
                    color: theme.colors.info,
                    fontWeight: "600",
                  },
                ]}
              >
                {hasWarmupBlock
                  ? `✓ ${t("createRoutine.warmup")}`
                  : `+ ${t("createRoutine.warmup")}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.specialBlockButton,
                hasCooldownBlock && styles.specialBlockButtonActive,
                { borderColor: theme.colors.success },
              ]}
              onPress={handleAddCooldownBlock}
              disabled={hasCooldownBlock}
            >
              <Ionicons
                name="leaf"
                size={24}
                color={
                  hasCooldownBlock
                    ? theme.colors.success
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.specialBlockButtonText,
                  hasCooldownBlock && {
                    color: theme.colors.success,
                    fontWeight: "600",
                  },
                ]}
              >
                {hasCooldownBlock
                  ? `✓ ${t("createRoutine.cooldown")}`
                  : `+ ${t("createRoutine.cooldown")}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Renderizar bloque de calentamiento si existe (no draggable) */}
        {warmupBlock && renderNonDraggableBlock(warmupBlock)}
      </>
    ),
    [
      routineName,
      hasWarmupBlock,
      hasCooldownBlock,
      handleAddWarmupBlock,
      handleAddCooldownBlock,
      warmupBlock,
    ],
  );

  const renderFooter = useMemo(
    () => (
      <>
        {/* Renderizar bloque de elongación si existe (no draggable) */}
        {cooldownBlock && renderNonDraggableBlock(cooldownBlock)}

        <View style={{ paddingBottom: insets.bottom + 160 }}>
          <Button
            title={t("createRoutine.addBlock")}
            onPress={handleAddBlock}
            variant="ghost"
            size="medium"
            fullWidth
          />
        </View>
      </>
    ),
    [insets.bottom, handleAddBlock, cooldownBlock],
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <DraggableFlatList
          data={normalBlocks}
          renderItem={renderBlock}
          keyExtractor={(item) => item.id}
          onDragEnd={({ data }) => handleReorderBlocks(data)}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        />

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + theme.spacing.lg },
          ]}
        >
          <Button
            title={
              isEditMode
                ? t("createRoutine.updateRoutine")
                : t("createRoutine.saveRoutine")
            }
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

        <EditActivityModal
          visible={!!editingActivity}
          activity={editingActivity}
          onClose={() => {
            setEditingActivity(null);
            setEditingActivityBlockId("");
          }}
          onSave={handleSaveEditedActivity}
        />

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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  blockHeaderActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "center",
  },
  blockActionButton: {
    padding: theme.spacing.xs,
  },
  blockNameInput: {
    flex: 1,
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  repetitionsRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  counterText: {
    ...theme.typography.h3,
    minWidth: 32,
    textAlign: "center",
  },
  restBetweenRepsSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.rest + "10",
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.rest + "30",
    gap: theme.spacing.sm,
  },
  restBetweenRepsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  restBetweenRepsLabel: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  restTimeDisplay: {
    minWidth: 120,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  restTimeText: {
    ...theme.typography.bodyBold,
    color: theme.colors.rest,
    fontSize: 16,
  },
  restBetweenRepsHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: theme.spacing.xs,
  },
  activitiesList: {
    marginBottom: theme.spacing.md,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    minHeight: 60,
  },
  activityDragHandle: {
    paddingRight: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.backgroundCard,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  activityInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  activityName: {
    ...theme.typography.bodyBold,
    marginBottom: 2,
  },
  activityDetails: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  activityActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  activityActionButton: {
    padding: theme.spacing.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  dragHandle: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  emptyBlockIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warning + "15",
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning + "40",
    marginBottom: theme.spacing.md,
  },
  emptyBlockText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    flex: 1,
    fontSize: 13,
  },
  blockCardDragging: {
    opacity: 0.8,
    transform: [{ scale: 1.02 }],
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  activityItemDragging: {
    opacity: 0.9,
    transform: [{ scale: 1.05 }],
    backgroundColor: theme.colors.backgroundCard,
    elevation: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  specialBlockIcon: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  specialBlocksSection: {
    marginBottom: theme.spacing.lg,
  },
  specialBlocksTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  specialBlocksButtons: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  specialBlockButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  specialBlockButtonActive: {
    borderWidth: 2,
    backgroundColor: theme.colors.backgroundCardLight,
  },
  specialBlockButtonText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  addRestBlockButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  addRestBlockLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  addRestBlockContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  addRestBlockText: {
    ...theme.typography.caption,
    color: theme.colors.rest,
    fontWeight: "600",
  },
});
