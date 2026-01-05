import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import { theme } from "../theme";
import { ExerciseTemplate } from "../types";

interface SubstitutePickerModalProps {
  visible: boolean;
  exercise: ExerciseTemplate | null;
  allExercises: ExerciseTemplate[];
  onSave: (substituteIds: string[]) => Promise<void>;
  onClose: () => void;
}

export function SubstitutePickerModal({
  visible,
  exercise,
  allExercises,
  onSave,
  onClose,
}: SubstitutePickerModalProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Initialize selected IDs when modal opens with different exercise
  React.useEffect(() => {
    if (exercise) {
      setSelectedIds(new Set(exercise.substitutes || []));
      setSearchQuery("");
    }
  }, [exercise?.id]);

  // Filter exercises (exclude current exercise)
  const filteredExercises = useMemo(() => {
    if (!exercise) return [];

    return allExercises
      .filter((ex) => ex.id !== exercise.id)
      .filter((ex) =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [allExercises, exercise, searchQuery]);

  const toggleSelection = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selectedIds));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error("Error saving substitutes:", error);
    } finally {
      setSaving(false);
    }
  };

  const renderExerciseItem = ({ item }: { item: ExerciseTemplate }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.exerciseItem, isSelected && styles.exerciseItemSelected]}
        onPress={() => toggleSelection(item.id)}
      >
        <View style={styles.exerciseLeft}>
          <View
            style={[
              styles.exerciseIcon,
              isSelected && styles.exerciseIconSelected,
            ]}
          >
            <Ionicons
              name={item.icon as any}
              size={24}
              color={isSelected ? "#FFFFFF" : theme.colors.exercise}
            />
          </View>
          <Text
            style={[
              styles.exerciseName,
              isSelected && styles.exerciseNameSelected,
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </View>
        <View
          style={[styles.checkbox, isSelected && styles.checkboxSelected]}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!exercise) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {t("exercises.selectSubstitutes")}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {exercise.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{t("common.save")}</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={t("exercises.searchExercises")}
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Selection Count */}
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {t("exercises.substitutesCount", { count: selectedIds.size })}
          </Text>
        </View>

        {/* Exercise List */}
        <FlatList
          data={filteredExercises}
          renderItem={renderExerciseItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="fitness-outline"
                size={48}
                color={theme.colors.textTertiary}
              />
              <Text style={styles.emptyText}>
                {t("exercises.noExercises")}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h4,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  saveButton: {
    padding: theme.spacing.sm,
  },
  saveButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.xs,
  },
  countContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  countText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  exerciseItemSelected: {
    backgroundColor: theme.colors.primary + "15",
    borderColor: theme.colors.primary,
  },
  exerciseLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.md,
  },
  exerciseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.exercise + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseIconSelected: {
    backgroundColor: theme.colors.primary,
  },
  exerciseName: {
    ...theme.typography.body,
    flex: 1,
  },
  exerciseNameSelected: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.md,
  },
});
