import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { Activity, Block } from "../types";
import { formatTime } from "../utils/helpers";

type Props = NativeStackScreenProps<RootStackParamList, "SelectStartPoint">;

interface SequencedActivity extends Activity {
  sequenceIndex: number;
  blockIndex: number;
  blockName: string;
  blockRepetition: number;
}

// Generate activity sequence (same logic as ExecuteRoutineScreen)
function generateActivitySequence(
  blocks: Block[],
  t: (key: string, options?: Record<string, unknown>) => string
): SequencedActivity[] {
  const sequence: SequencedActivity[] = [];
  let sequenceIndex = 0;

  blocks.forEach((block, blockIndex) => {
    for (let rep = 0; rep < block.repetitions; rep++) {
      block.activities.forEach((activity) => {
        sequence.push({
          ...activity,
          sequenceIndex: sequenceIndex++,
          blockIndex,
          blockName:
            block.name ||
            t("createRoutine.blockDefaultName", { number: blockIndex + 1 }),
          blockRepetition: rep + 1,
        });
      });

      // Add rest between reps
      if (
        rep < block.repetitions - 1 &&
        block.restBetweenReps &&
        block.restBetweenReps > 0
      ) {
        sequence.push({
          id: `rest-between-reps-${block.id}-${rep}`,
          type: "rest",
          name: t("executeRoutine.restBetweenReps"),
          icon: "pause-circle" as any,
          exerciseType: "time",
          duration: block.restBetweenReps,
          sequenceIndex: sequenceIndex++,
          blockIndex,
          blockName:
            block.name ||
            t("createRoutine.blockDefaultName", { number: blockIndex + 1 }),
          blockRepetition: rep + 1,
        });
      }
    }
  });

  return sequence;
}

interface BlockSectionProps {
  block: Block;
  blockIndex: number;
  activities: SequencedActivity[];
  selectedIndex: number | null;
  onSelectActivity: (index: number) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function BlockSection({
  block,
  blockIndex,
  activities,
  selectedIndex,
  onSelectActivity,
  t,
}: BlockSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const blockName =
    block.name ||
    t("createRoutine.blockDefaultName", { number: blockIndex + 1 });

  const getBlockIcon = () => {
    switch (block.type) {
      case "warmup":
        return "flame";
      case "cooldown":
        return "leaf";
      case "rest-block":
        return "pause-circle";
      default:
        return "layers";
    }
  };

  const getBlockColor = () => {
    switch (block.type) {
      case "warmup":
        return theme.colors.info;
      case "cooldown":
        return theme.colors.success;
      case "rest-block":
        return theme.colors.rest;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <View style={styles.blockSection}>
      {/* Block Header */}
      <TouchableOpacity
        style={styles.blockHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.blockHeaderLeft}>
          <View
            style={[
              styles.blockIconContainer,
              { backgroundColor: getBlockColor() + "20" },
            ]}
          >
            <Ionicons
              name={getBlockIcon() as any}
              size={20}
              color={getBlockColor()}
            />
          </View>
          <View>
            <Text style={styles.blockName}>{blockName}</Text>
            <Text style={styles.blockInfo}>
              {block.repetitions > 1
                ? t("selectStartPoint.repetitions", {
                    count: block.repetitions,
                  })
                : t("selectStartPoint.activities", {
                    count: block.activities.length,
                  })}
            </Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={24}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Activities */}
      {isExpanded && (
        <View style={styles.activitiesList}>
          {activities.map((activity) => {
            const isSelected = selectedIndex === activity.sequenceIndex;
            const isRest = activity.type === "rest";

            return (
              <TouchableOpacity
                key={activity.sequenceIndex}
                style={[
                  styles.activityItem,
                  isSelected && styles.activityItemSelected,
                  isRest && styles.activityItemRest,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectActivity(activity.sequenceIndex);
                }}
              >
                <View style={styles.activityLeft}>
                  <View
                    style={[
                      styles.activityIcon,
                      isRest && styles.activityIconRest,
                      isSelected && styles.activityIconSelected,
                    ]}
                  >
                    <Ionicons
                      name={activity.icon as any}
                      size={18}
                      color={
                        isSelected
                          ? "#FFFFFF"
                          : isRest
                          ? theme.colors.rest
                          : theme.colors.exercise
                      }
                    />
                  </View>
                  <View style={styles.activityTextContainer}>
                    <Text
                      style={[
                        styles.activityName,
                        isSelected && styles.activityNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {activity.name}
                    </Text>
                    {block.repetitions > 1 && (
                      <Text style={styles.activityRep}>
                        {t("executeRoutine.repLabel")}{" "}
                        {activity.blockRepetition}/{block.repetitions}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.activityRight}>
                  {activity.exerciseType === "time" && activity.duration && (
                    <Text
                      style={[
                        styles.activityDuration,
                        isSelected && styles.activityDurationSelected,
                      ]}
                    >
                      {formatTime(activity.duration)}
                    </Text>
                  )}
                  {activity.exerciseType === "reps" && activity.reps && (
                    <Text
                      style={[
                        styles.activityDuration,
                        isSelected && styles.activityDurationSelected,
                      ]}
                    >
                      {activity.reps} reps
                    </Text>
                  )}
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={theme.colors.primary}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function SelectStartPointScreen({ navigation, route }: Props) {
  const { routine } = route.params;
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Generate the full activity sequence
  const activitySequence = useMemo(
    () => generateActivitySequence(routine.blocks, t),
    [routine, t]
  );

  // Group activities by block
  const activitiesByBlock = useMemo(() => {
    const grouped: Map<number, SequencedActivity[]> = new Map();
    activitySequence.forEach((activity) => {
      const existing = grouped.get(activity.blockIndex) || [];
      existing.push(activity);
      grouped.set(activity.blockIndex, existing);
    });
    return grouped;
  }, [activitySequence]);

  const handleStartFromHere = () => {
    if (selectedIndex === null) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.replace("ExecuteRoutine", {
      routine,
      startingIndex: selectedIndex,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t("selectStartPoint.title")}</Text>
          <Text style={styles.headerSubtitle}>{routine.name}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Instruction */}
      <View style={styles.instructionContainer}>
        <Ionicons
          name="information-circle"
          size={20}
          color={theme.colors.accent}
        />
        <Text style={styles.instructionText}>
          {t("selectStartPoint.selectActivity")}
        </Text>
      </View>

      {/* Block List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {routine.blocks.map((block, index) => (
          <BlockSection
            key={block.id}
            block={block}
            blockIndex={index}
            activities={activitiesByBlock.get(index) || []}
            selectedIndex={selectedIndex}
            onSelectActivity={setSelectedIndex}
            t={t}
          />
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.startButton,
            selectedIndex === null && styles.startButtonDisabled,
          ]}
          onPress={handleStartFromHere}
          disabled={selectedIndex === null}
        >
          <Ionicons name="play" size={24} color="#FFFFFF" />
          <Text style={styles.startButtonText}>
            {t("selectStartPoint.startFromHere")}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  backButton: {
    padding: theme.spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    ...theme.typography.h4,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  headerRight: {
    width: 32,
  },
  instructionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.accent + "15",
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  instructionText: {
    ...theme.typography.body,
    color: theme.colors.accent,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  blockSection: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCardLight,
  },
  blockHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  blockIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  blockName: {
    ...theme.typography.bodyBold,
  },
  blockInfo: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  activitiesList: {
    padding: theme.spacing.sm,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  activityItemSelected: {
    backgroundColor: theme.colors.primary + "20",
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  activityItemRest: {
    opacity: 0.7,
  },
  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.md,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  activityIconRest: {
    backgroundColor: theme.colors.rest + "15",
  },
  activityIconSelected: {
    backgroundColor: theme.colors.primary,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityName: {
    ...theme.typography.body,
  },
  activityNameSelected: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  activityRep: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  activityRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  activityDuration: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  activityDurationSelected: {
    color: theme.colors.primary,
  },
  footer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    ...theme.typography.bodyBold,
    color: "#FFFFFF",
    fontSize: 18,
  },
});
