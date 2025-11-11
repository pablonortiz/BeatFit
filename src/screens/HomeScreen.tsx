import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { Button, Card } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { isUsingRemoteStorage } from '../services/storage';
import { requestMicrophonePermission } from '../hooks/useVoiceRecognition';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  // Pedir permiso de micrófono al montar
  useEffect(() => {
    requestMicrophonePermission();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      <View style={styles.header}>
        <Text style={styles.logo}>BeatFit</Text>
        <Text style={styles.subtitle}>Tu entrenador personal</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.modeCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="list" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.modeTitle}>Rutina Completa</Text>
          <Text style={styles.modeDescription}>
            Arma tu rutina de principio a fin con bloques y repeticiones
          </Text>
          <Button
            title="Crear Rutina"
            onPress={() => navigation.navigate('CreateRoutine', { mode: 'full' })}
            variant="primary"
            fullWidth
            style={styles.modeButton}
          />
        </Card>

        <Card style={styles.modeCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="play-forward" size={48} color={theme.colors.accent} />
          </View>
          <Text style={styles.modeTitle}>Modo Dinámico</Text>
          <Text style={styles.modeDescription}>
            Ve ejercicio por ejercicio, agrega sobre la marcha
          </Text>
          <Button
            title="Comenzar"
            onPress={() => navigation.navigate('CreateRoutine', { mode: 'dynamic' })}
            variant="accent"
            fullWidth
            style={styles.modeButton}
          />
        </Card>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('RoutinesList')}
          >
            <Ionicons name="folder-open" size={32} color={theme.colors.secondary} />
            <Text style={styles.actionText}>Mis Rutinas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('WorkoutHistory')}
          >
            <Ionicons name="calendar" size={32} color={theme.colors.accent} />
            <Text style={styles.actionText}>Historial</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Stats')}
          >
            <Ionicons name="stats-chart" size={32} color={theme.colors.primary} />
            <Text style={styles.actionText}>Estadísticas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ManageExercises')}
          >
            <Ionicons name="barbell" size={32} color={theme.colors.success} />
            <Text style={styles.actionText}>Ejercicios</Text>
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
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
    alignItems: 'center',
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
    paddingTop: theme.spacing.lg,
  },
  modeCard: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.backgroundCardLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modeTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.sm,
  },
  modeDescription: {
    ...theme.typography.bodySmall,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    color: theme.colors.textSecondary,
  },
  modeButton: {
    minWidth: 200,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionText: {
    ...theme.typography.bodySmall,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  actionTextDisabled: {
    color: theme.colors.textDisabled,
  },
  comingSoon: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
});
