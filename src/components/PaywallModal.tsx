import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { theme } from "../theme";
import { usePremium } from "../contexts/PremiumContext";
import { formatPrice } from "../services/purchaseService";
import * as Haptics from "expo-haptics";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

export function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const { t } = useTranslation();
  const {
    isPremium,
    isLoading,
    offering,
    purchasePremium,
    restorePurchasesAction,
  } = usePremium();

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthlyPackage = offering?.monthly || offering?.availablePackages?.[0];
  const priceString = monthlyPackage
    ? formatPrice(monthlyPackage)
    : "$4.99";

  const handlePurchase = async () => {
    if (isPremium) {
      onClose();
      return;
    }

    setError(null);
    setPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await purchasePremium();
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message || t("premium.purchaseError"));
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setError(null);
    setRestoring(true);

    try {
      const result = await restorePurchasesAction();
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message || t("premium.restoreError"));
    } finally {
      setRestoring(false);
    }
  };

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
            <Ionicons
              name="close"
              size={28}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Premium Badge */}
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={48} color={theme.colors.warning} />
          </View>

          <Text style={styles.title}>{t("premium.title")}</Text>
          <Text style={styles.subtitle}>{t("premium.subtitle")}</Text>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <FeatureItem
              icon="locate-outline"
              title={t("premium.features.startAnyPointTitle")}
              description={t("premium.features.startAnyPoint")}
            />
            <FeatureItem
              icon="swap-horizontal"
              title={t("premium.features.substitutesTitle")}
              description={t("premium.features.substitutes")}
            />
            <FeatureItem
              icon="rocket-outline"
              title={t("premium.features.moreFeaturesTitle")}
              description={t("premium.features.moreFeatures")}
            />
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Price */}
          <Text style={styles.priceText}>
            {t("premium.monthlyPrice", { price: priceString })}
          </Text>

          {/* Subscribe Button */}
          <TouchableOpacity
            style={[
              styles.subscribeButton,
              (purchasing || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={purchasing || isLoading}
          >
            {purchasing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.subscribeButtonText}>
                {isPremium
                  ? t("premium.alreadyPremium")
                  : t("premium.subscribe")}
              </Text>
            )}
          </TouchableOpacity>

          {/* Restore Purchases */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring || isLoading}
          >
            {restoring ? (
              <ActivityIndicator
                color={theme.colors.textSecondary}
                size="small"
              />
            ) : (
              <Text style={styles.restoreButtonText}>{t("premium.restore")}</Text>
            )}
          </TouchableOpacity>
        </View>
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
    justifyContent: "flex-end",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    alignItems: "center",
  },
  premiumBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.warning + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    borderWidth: 3,
    borderColor: theme.colors.warning,
  },
  title: {
    ...theme.typography.h1,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  featuresContainer: {
    width: "100%",
    gap: theme.spacing.lg,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    ...theme.typography.bodyBold,
    marginBottom: 2,
  },
  featureDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error + "20",
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  priceText: {
    ...theme.typography.h3,
    textAlign: "center",
    color: theme.colors.textPrimary,
  },
  subscribeButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    ...theme.typography.bodyBold,
    color: "#FFFFFF",
    fontSize: 18,
  },
  restoreButton: {
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  restoreButtonText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textDecorationLine: "underline",
  },
});
