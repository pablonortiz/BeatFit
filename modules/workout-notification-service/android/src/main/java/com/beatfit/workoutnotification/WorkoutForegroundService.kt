package com.beatfit.workoutnotification

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import java.util.concurrent.TimeUnit

class WorkoutForegroundService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private var updateRunnable: Runnable? = null
    private var isRunning = false
    
    private var routineName: String = ""
    private var currentExercise: String = ""
    private var startTime: Long = 0
    private var isPaused: Boolean = false
    private var pausedAt: Long = -1
    private var totalPausedTime: Long = 0
    private var exerciseType: String = "time"
    private var exerciseDuration: Long = -1
    private var exerciseStartTime: Long = 0
    private var exerciseReps: Int = -1
    private var progress: Double = 0.0
    
    companion object {
        private const val TAG = "WorkoutForeground"
        private const val CHANNEL_ID = "workout-foreground"
        private const val NOTIFICATION_ID = 9999
        private const val UPDATE_INTERVAL_MS = 1000L // 1 segundo
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service onCreate()")
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand called, action: ${intent?.action}")

        when (intent?.action) {
            "UPDATE_WORKOUT_DATA" -> {
                Log.d(TAG, "Updating workout data")
                updateWorkoutData(intent)
                return START_STICKY
            }
        }

        if (intent != null) {
            Log.d(TAG, "Starting foreground service")
            loadWorkoutData(intent)
            startForegroundService()
        } else {
            Log.w(TAG, "onStartCommand called with null intent")
        }

        return START_STICKY
    }

    private fun loadWorkoutData(intent: Intent) {
        routineName = intent.getStringExtra("routineName") ?: ""
        currentExercise = intent.getStringExtra("currentExercise") ?: ""
        startTime = intent.getLongExtra("startTime", System.currentTimeMillis())
        isPaused = intent.getBooleanExtra("isPaused", false)
        pausedAt = intent.getLongExtra("pausedAt", -1)
        totalPausedTime = intent.getLongExtra("totalPausedTime", 0)
        exerciseType = intent.getStringExtra("exerciseType") ?: "time"
        exerciseDuration = intent.getLongExtra("exerciseDuration", -1)
        exerciseStartTime = intent.getLongExtra("exerciseStartTime", System.currentTimeMillis())
        exerciseReps = intent.getIntExtra("exerciseReps", -1)
        progress = intent.getDoubleExtra("progress", 0.0)

        Log.d(TAG, "Loaded workout data: routine=$routineName, exercise=$currentExercise, " +
                "type=$exerciseType, duration=$exerciseDuration, isPaused=$isPaused, progress=$progress")
    }

    private fun updateWorkoutData(intent: Intent) {
        loadWorkoutData(intent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Entrenamiento en Progreso",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Muestra el progreso del entrenamiento en curso"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun startForegroundService() {
        isRunning = true
        Log.d(TAG, "Starting foreground service with notification")

        // Mostrar notificación inicial
        updateNotification()

        // Iniciar actualización cada segundo
        updateRunnable = object : Runnable {
            override fun run() {
                if (isRunning) {
                    updateNotification()
                    handler.postDelayed(this, UPDATE_INTERVAL_MS)
                }
            }
        }
        handler.post(updateRunnable!!)
        Log.d(TAG, "Foreground service started, updates every ${UPDATE_INTERVAL_MS}ms")
    }

    private fun updateNotification() {
        val now = System.currentTimeMillis()
        
        // Calcular tiempo total transcurrido
        val elapsedSeconds = if (isPaused && pausedAt > 0) {
            TimeUnit.MILLISECONDS.toSeconds(pausedAt - startTime - totalPausedTime)
        } else {
            TimeUnit.MILLISECONDS.toSeconds(now - startTime - totalPausedTime)
        }
        
        // Calcular tiempo del ejercicio actual
        var exerciseTime = ""
        var exerciseProgress = 0
        
        if (exerciseType == "time" && exerciseDuration > 0) {
            val exerciseElapsed = if (isPaused && pausedAt > 0) {
                TimeUnit.MILLISECONDS.toSeconds(pausedAt - exerciseStartTime)
            } else {
                TimeUnit.MILLISECONDS.toSeconds(now - exerciseStartTime)
            }
            val remaining = maxOf(0, exerciseDuration - exerciseElapsed)
            exerciseTime = formatTime(remaining)
            exerciseProgress = minOf(100, ((exerciseElapsed.toDouble() / exerciseDuration) * 100).toInt())
        } else if (exerciseType == "reps" && exerciseReps > 0) {
            exerciseTime = "$exerciseReps reps"
        }
        
        val totalTime = formatTime(elapsedSeconds)
        val progressPercent = (progress * 100).toInt()
        
        val title = if (isPaused) "⏸️ Entrenamiento en pausa" else "🏃 Entrenamiento en progreso"
        
        val body = buildString {
            append(routineName)
            append("\n⏱️ Tiempo total: $totalTime")
            append("\n💪 $currentExercise")
            if (exerciseTime.isNotEmpty()) {
                append(" • $exerciseTime")
            }
            append("\n📊 Progreso: $progressPercent%")
        }
        
        // Crear notificación usando Notifee
        updateNotifeeNotification(title, body, exerciseProgress, progressPercent)
    }

    private fun formatTime(seconds: Long): String {
        val hours = seconds / 3600
        val mins = (seconds % 3600) / 60
        val secs = seconds % 60

        return if (hours > 0) {
            String.format("%d:%02d:%02d", hours, mins, secs)
        } else {
            String.format("%02d:%02d", mins, secs)
        }
    }

    private fun getNotificationIcon(): Int {
        // Intentar obtener el ícono personalizado, sino usar el ícono de la app
        val iconId = resources.getIdentifier("notification_icon", "drawable", packageName)
        return if (iconId != 0) iconId else applicationInfo.icon
    }

    private fun updateNotifeeNotification(title: String, body: String, exerciseProgress: Int, progressPercent: Int) {
        // Crear intent para abrir la app cuando se toca la notificación
        val packageName = applicationContext.packageName
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Usar notificación nativa de Android con estilo avanzado
        val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setSmallIcon(getNotificationIcon())
            .setContentIntent(pendingIntent) // Abrir app al tocar
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setColor(0xFFFF6B35.toInt()) // Color naranja de BeatFit
            .setShowWhen(false)
            .setOnlyAlertOnce(true) // Solo alertar una vez, no en cada actualización
        
        // Agregar progress bar si es ejercicio de tiempo
        if (exerciseType == "time" && exerciseDuration > 0) {
            notificationBuilder.setProgress(100, exerciseProgress, false)
        }
        
        val notification = notificationBuilder.build()
        startForeground(NOTIFICATION_ID, notification)
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service onDestroy() - stopping foreground service")
        isRunning = false
        updateRunnable?.let { handler.removeCallbacks(it) }
        stopForeground(true)
        stopSelf()
    }
}

