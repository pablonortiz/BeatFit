import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { Card } from "../components";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { setStoredLanguage } from "../i18n";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

type Language = {
  code: string;
  name: string;
  nativeName: string;
};

const languages: Language[] = [
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
];

export default function SettingsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  const handleLanguageChange = async (languageCode: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await i18n.changeLanguage(languageCode);
      await setStoredLanguage(languageCode);
      setCurrentLanguage(languageCode);
    } catch (error) {
      console.error("Error changing language:", error);
    }
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
          <Text style={styles.sectionDescription}>
            {t("settings.languageDesc")}
          </Text>

          <Card style={styles.settingsCard}>
            {languages.map((language, index) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageOption,
                  index !== languages.length - 1 && styles.languageOptionBorder,
                ]}
                onPress={() => handleLanguageChange(language.code)}
              >
                <View style={styles.languageInfo}>
                  <Text style={styles.languageName}>{language.nativeName}</Text>
                  <Text style={styles.languageSubname}>{language.name}</Text>
                </View>
                {currentLanguage === language.code && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={theme.colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("settings.about")}</Text>

          <Card style={styles.aboutCard}>
            <View style={styles.appIconContainer}>
              <View style={styles.appIcon}>
                <Ionicons
                  name="fitness"
                  size={48}
                  color={theme.colors.primary}
                />
              </View>
            </View>

            <Text style={styles.appName}>BeatFit</Text>
            <Text style={styles.appVersion}>
              {t("settings.version", { version: appVersion })}
            </Text>

            <View style={styles.divider} />

            <View style={styles.creditsContainer}>
              <Text style={styles.creditsLabel}>{t("settings.credits")}</Text>
              <Text style={styles.developerName}>
                {t("settings.developer")}
              </Text>
            </View>

            <View style={styles.copyrightContainer}>
              <Text style={styles.copyrightText}>
                © 2025 Pablo Nicolás Ortiz
              </Text>
              <Text style={styles.copyrightText}>
                Todos los derechos reservados
              </Text>
            </View>
          </Card>
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
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.xs,
  },
  sectionDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  settingsCard: {
    padding: 0,
    overflow: "hidden",
  },
  languageOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  languageOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    ...theme.typography.bodyBold,
    marginBottom: 2,
  },
  languageSubname: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  aboutCard: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  appIconContainer: {
    marginBottom: theme.spacing.lg,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  appName: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.xs,
  },
  appVersion: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },
  creditsContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  creditsLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  developerName: {
    ...theme.typography.h4,
    color: theme.colors.primary,
  },
  copyrightContainer: {
    alignItems: "center",
    gap: 4,
  },
  copyrightText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    fontSize: 11,
  },
});
