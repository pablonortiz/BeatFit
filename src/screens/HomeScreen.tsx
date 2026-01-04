import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { Button, Card } from "../components";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.background}
      />

      <View style={styles.header}>
        <Text style={styles.logo}>{t("home.title")}</Text>
        <Text style={styles.subtitle}>{t("home.subtitle")}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Sección principal: Mis Rutinas */}
        <Card style={styles.primaryCard}>
          <View style={styles.primaryCardHeader}>
            <View>
              <Text style={styles.primaryCardTitle}>
                {t("home.myRoutines")}
              </Text>
              <Text style={styles.primaryCardSubtitle}>
                {t("home.accessWorkouts")}
              </Text>
            </View>
            <View style={styles.primaryIconContainer}>
              <Ionicons
                name="folder-open"
                size={40}
                color={theme.colors.primary}
              />
            </View>
          </View>
          <Button
            title={t("home.viewMyRoutines")}
            onPress={() => navigation.navigate("RoutinesList")}
            variant="primary"
            fullWidth
            style={styles.primaryButton}
          />

          {/* Botón secundario para crear rutina */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("CreateRoutine", {})}
          >
            <Ionicons
              name="add-circle"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.secondaryButtonText}>
              {t("home.createRoutine")}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Accesos rápidos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("home.quickAccess")}</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("WorkoutHistory")}
          >
            <Ionicons name="calendar" size={32} color={theme.colors.accent} />
            <Text style={styles.actionText}>{t("home.workoutHistory")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Stats")}
          >
            <Ionicons
              name="stats-chart"
              size={32}
              color={theme.colors.primary}
            />
            <Text style={styles.actionText}>{t("stats.title")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("ManageExercises")}
          >
            <Ionicons name="barbell" size={32} color={theme.colors.success} />
            <Text style={styles.actionText}>{t("home.manageExercises")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Settings")}
          >
            <Ionicons
              name="settings"
              size={32}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.actionText}>{t("home.settings")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    alignItems: "center",
  },
  logo: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  primaryCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  primaryCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  primaryCardTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  primaryCardSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  primaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundCardLight,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    marginBottom: theme.spacing.md,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundCardLight,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  secondaryButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  sectionHeader: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionText: {
    ...theme.typography.bodySmall,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  actionTextDisabled: {
    color: theme.colors.textDisabled,
  },
  comingSoon: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
    fontStyle: "italic",
  },
});
