package com.beatfit.workoutnotification

import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

class WorkoutNotificationModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WorkoutNotificationService"
    }

    @ReactMethod
    fun startService(workoutData: ReadableMap, promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, WorkoutForegroundService::class.java)
            
            // Pasar datos del workout al servicio
            intent.putExtra("routineName", workoutData.getString("routineName") ?: "")
            intent.putExtra("currentExercise", workoutData.getString("currentExercise") ?: "")
            intent.putExtra("startTime", workoutData.getDouble("startTime").toLong())
            intent.putExtra("isPaused", workoutData.getBoolean("isPaused"))
            intent.putExtra("pausedAt", if (workoutData.hasKey("pausedAt")) workoutData.getDouble("pausedAt").toLong() else -1L)
            intent.putExtra("totalPausedTime", workoutData.getDouble("totalPausedTime").toLong())
            intent.putExtra("exerciseType", workoutData.getString("exerciseType") ?: "time")
            intent.putExtra("exerciseDuration", if (workoutData.hasKey("exerciseDuration")) workoutData.getDouble("exerciseDuration").toLong() else -1L)
            intent.putExtra("exerciseStartTime", workoutData.getDouble("exerciseStartTime").toLong())
            intent.putExtra("exerciseReps", if (workoutData.hasKey("exerciseReps")) workoutData.getInt("exerciseReps") else -1)
            intent.putExtra("progress", workoutData.getDouble("progress"))
            
            context.startForegroundService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to start service: ${e.message}", e)
        }
    }

    @ReactMethod
    fun updateWorkoutData(workoutData: ReadableMap, promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, WorkoutForegroundService::class.java)
            intent.action = "UPDATE_WORKOUT_DATA"
            
            intent.putExtra("routineName", workoutData.getString("routineName") ?: "")
            intent.putExtra("currentExercise", workoutData.getString("currentExercise") ?: "")
            intent.putExtra("startTime", workoutData.getDouble("startTime").toLong())
            intent.putExtra("isPaused", workoutData.getBoolean("isPaused"))
            intent.putExtra("pausedAt", if (workoutData.hasKey("pausedAt")) workoutData.getDouble("pausedAt").toLong() else -1L)
            intent.putExtra("totalPausedTime", workoutData.getDouble("totalPausedTime").toLong())
            intent.putExtra("exerciseType", workoutData.getString("exerciseType") ?: "time")
            intent.putExtra("exerciseDuration", if (workoutData.hasKey("exerciseDuration")) workoutData.getDouble("exerciseDuration").toLong() else -1L)
            intent.putExtra("exerciseStartTime", workoutData.getDouble("exerciseStartTime").toLong())
            intent.putExtra("exerciseReps", if (workoutData.hasKey("exerciseReps")) workoutData.getInt("exerciseReps") else -1)
            intent.putExtra("progress", workoutData.getDouble("progress"))
            
            reactApplicationContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to update workout data: ${e.message}", e)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, WorkoutForegroundService::class.java)
            reactApplicationContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to stop service: ${e.message}", e)
        }
    }
}




