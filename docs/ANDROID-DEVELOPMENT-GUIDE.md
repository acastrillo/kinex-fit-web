# Kinex Fit Android Development Guide

**Last Updated:** December 27, 2025
**Status:** Ready for Separate Project Implementation
**Target:** Beta Test in 2-3 Weeks
**Tech Stack:** Native Kotlin + Jetpack Compose

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Context](#project-context)
3. [Backend Architecture](#backend-architecture)
4. [Android App Architecture](#android-app-architecture)
5. [Authentication Implementation](#authentication-implementation)
6. [Instagram Share Sheet Integration](#instagram-share-sheet-integration)
7. [Latest Features (December 2024)](#latest-features-december-2024)
8. [Implementation Phases](#implementation-phases)
9. [API Endpoints Reference](#api-endpoints-reference)
10. [Testing Strategy](#testing-strategy)
11. [Deployment & Launch](#deployment--launch)
12. [Timeline & Budget](#timeline--budget)

---

## Executive Summary

### What is Kinex Fit?

Kinex Fit is a comprehensive fitness tracking application that allows users to:
- **Track workouts** with detailed exercise, set, and rep data
- **Scan workout images** using OCR (Instagram screenshots, gym whiteboards)
- **Monitor personal records (PRs)** and progress over time
- **Access AI-powered workout insights** (paid tiers)
- **Sync data** across web and mobile platforms

### The Killer Feature ⭐

**Instagram Share Sheet Integration** - Native Android intent filter allowing users to:
1. View workout post on Instagram
2. Tap "Share" → Select "Kinex Fit"
3. App opens with OCR processing the image
4. 2-tap workflow to save workouts

This is **100% App Store compliant** and violates no Instagram ToS (just standard Android share functionality).

### Backend Status

✅ **100% Production Ready** - Backend deployed at `https://kinexfit.com`
- Next.js 14 API routes on AWS ECS Fargate
- DynamoDB for user data & workouts
- Stripe for subscriptions (Live Mode)
- NextAuth for authentication (Google, Facebook, Email/Password)
- AWS Textract for OCR processing
- All API endpoints operational

### Why Native Kotlin?

- **Better Instagram share sheet integration** (requires native Android intents)
- **Superior performance** compared to React Native
- **Platform-specific features** (Material Design 3, haptics, widgets)
- **Offline-first architecture** with Room database
- **Long-term maintainability**

---

## Project Context

### Development Setup

- **IDE:** Android Studio on Windows 11
- **Language:** Kotlin
- **UI Framework:** Jetpack Compose
- **Architecture:** MVVM + Clean Architecture
- **Dependency Injection:** Hilt
- **Network:** Retrofit + OkHttp
- **Local Storage:** Room Database
- **Async:** Coroutines + Flow

### Separate Project Structure

This will be a **completely separate Android project** from the web app:
- New repository: `kinex-fit-android/`
- Separate codebase (no shared workspace needed)
- Connects to same backend APIs
- Independent deployment to Google Play

### Timeline

- **Beta Test Target:** 2-3 weeks from start
- **Full MVP:** 90 days
- **Development Tools:** Claude Code + ChatGPT Codex for coding assistance

---

## Backend Architecture

### Tech Stack Overview

```
┌─────────────────────────────────────────┐
│  Android App (Native Kotlin)            │
│  - Jetpack Compose UI                   │
│  - Material Design 3                    │
│  - Room Database (offline)              │
└──────────────┬──────────────────────────┘
               │
               │ HTTPS API Calls
               │ Bearer Token Auth
               │
┌──────────────▼──────────────────────────┐
│  Backend API (Next.js 14)               │
│  URL: https://kinexfit.com │
│  - /api/auth/* (NextAuth + OAuth/Credentials) │
│  - /api/workouts/*                      │
│  - /api/stripe/*                        │
│  - /api/user/*                          │
│  - /api/ocr/* (Textract)                │
│  - /api/ai/* (Bedrock - Phase 6)        │
└──────────────┬──────────────────────────┘
               │
               ├──► DynamoDB (AWS)
               │    - users table (EmailIndex GSI)
               │    - workouts table
               │    - completions table (NEW)
               │    - stripeCustomerId-index GSI
               │
               ├──► Stripe (Live Mode)
               │    - Subscriptions
               │    - Customer Portal
               │    - Webhooks
               │
               └──► AWS Services
                    - S3 (workout images)
                    - Textract (OCR)
                    - Bedrock (AI features)
                    - CloudWatch (logs)
                    - ECS Fargate (hosting)
```

### DynamoDB Schema

**users table:**
```typescript
{
  id: string (UUID, partition key)
  email: string (unique, indexed via EmailIndex GSI)
  firstName: string | null
  lastName: string | null
  passwordHash: string | null

  // OAuth
  provider: string // "google" | "facebook" | "credentials"

  // Subscription
  subscriptionTier: string // "free" | "core" | "pro" | "elite"
  subscriptionStatus: string // "active" | "inactive" | "trialing" | "canceled"
  stripeCustomerId: string (indexed via stripeCustomerId-index GSI)
  stripeSubscriptionId: string
  subscriptionStartDate: string (ISO)
  subscriptionEndDate: string (ISO)

  // Usage Quotas (monthly, combined scans)
  scanQuotaUsed: number
  scanQuotaResetDate: string (ISO)
  ocrQuotaUsed: number             // per-source analytics
  instagramImportsUsed: number     // per-source analytics
  workoutsSaved: number
  aiRequestsUsed: number
  aiRequestsLimit: number
  // Legacy (not enforced)
  ocrQuotaLimit: number             // legacy, not enforced

  // Training Profile
  trainingProfile: object {
    experience: string
    goals: string[]
    equipment: string[]
  }

  createdAt: string (ISO)
  updatedAt: string (ISO)
}
```

**workouts table:**
```typescript
{
  userId: string (partition key)
  workoutId: string (sort key, UUID)
  title: string
  description: string | null
  content: string // Markdown workout content
  source: string // "user" | "ai" | "import"
  type: string // "strength" | "cardio" | "mixed"
  difficulty: string // "beginner" | "intermediate" | "advanced"
  tags: string[]

  exercises: [{
    id: string (UUID)
    name: string
    notes: string | null
    sets: number
    reps: string | number
    weight: string | number | null
    restSeconds: number | null
    setDetails: [{
      id: string
      reps: string | number | null
      weight: string | number | null
    }]
  }]

  // Timer Configuration (December 2024)
  timerConfig: {
    params: {
      kind: "EMOM" | "AMRAP" | "INTERVAL_WORK_REST" | "TABATA"
      intervalSeconds?: number
      totalMinutes?: number
      durationSeconds?: number
      workSeconds?: number
      restSeconds?: number
      totalRounds?: number
      prepSeconds?: number
      rounds?: number
    }
    aiGenerated?: boolean
    reason?: string
  } | null

  // Completion tracking
  status: "draft" | "scheduled" | "completed" | null
  scheduledDate: string (ISO) | null
  completedDate: string (ISO) | null
  completedAt: string (ISO timestamp) | null
  durationSeconds: number | null

  // Media
  imageUrls: string[]
  thumbnailUrl: string | null

  createdAt: string (ISO)
  updatedAt: string (ISO)
}
```

**completions table** (NEW - December 2024):
```typescript
{
  userId: string (partition key)
  completionId: string (sort key, UUID)
  workoutId: string (indexed via workoutId-index GSI)
  completedAt: string (ISO timestamp)
  durationSeconds: number
  notes?: string
  exercises?: Array<{
    exerciseId: string
    completed: boolean
    completedAt?: string
  }>
}
```

---

## Android App Architecture

### Recommended Architecture: MVVM + Clean Architecture

```
app/
├── data/
│   ├── remote/
│   │   ├── api/
│   │   │   ├── AuthApi.kt
│   │   │   ├── WorkoutApi.kt
│   │   │   ├── OCRApi.kt
│   │   │   ├── SubscriptionApi.kt
│   │   ├── dto/
│   │   │   ├── UserDto.kt
│   │   │   ├── WorkoutDto.kt
│   │   │   ├── SubscriptionDto.kt
│   │   └── interceptors/
│   │       ├── AuthInterceptor.kt
│   │       └── ErrorInterceptor.kt
│   ├── local/
│   │   ├── db/
│   │   │   ├── AppDatabase.kt
│   │   │   ├── dao/
│   │   │   │   ├── WorkoutDao.kt
│   │   │   │   └── UserDao.kt
│   │   │   └── entities/
│   │   │       ├── WorkoutEntity.kt
│   │   │       └── UserEntity.kt
│   │   └── preferences/
│   │       └── SessionManager.kt
│   └── repository/
│       ├── AuthRepository.kt
│       ├── WorkoutRepository.kt
│       └── SubscriptionRepository.kt
├── domain/
│   ├── model/
│   │   ├── User.kt
│   │   ├── Workout.kt
│   │   ├── Exercise.kt
│   │   └── Subscription.kt
│   └── usecase/
│       ├── auth/
│       │   ├── SignInWithGoogleUseCase.kt
│       │   ├── SignInWithEmailUseCase.kt
│       │   └── SignUpUseCase.kt
│       ├── workout/
│       │   ├── GetWorkoutsUseCase.kt
│       │   ├── CreateWorkoutUseCase.kt
│       │   ├── CompleteWorkoutUseCase.kt
│       │   └── SyncWorkoutsUseCase.kt
│       └── subscription/
│           ├── GetCurrentTierUseCase.kt
│           └── UpgradeTierUseCase.kt
├── presentation/
│   ├── ui/
│   │   ├── auth/
│   │   │   ├── LoginActivity.kt
│   │   │   └── SignUpActivity.kt
│   │   ├── workouts/
│   │   │   ├── WorkoutListFragment.kt
│   │   │   ├── WorkoutDetailFragment.kt
│   │   │   ├── WorkoutSessionFragment.kt (NEW - Dec 2024)
│   │   │   └── CreateWorkoutFragment.kt
│   │   ├── share/
│   │   │   ├── ShareActivity.kt (KILLER FEATURE)
│   │   │   └── OCRReviewScreen.kt
│   │   ├── subscription/
│   │   │   └── SubscriptionFragment.kt
│   │   └── common/
│   │       └── MainActivity.kt
│   └── viewmodel/
│       ├── AuthViewModel.kt
│       ├── WorkoutViewModel.kt
│       ├── WorkoutSessionViewModel.kt (NEW)
│       └── SubscriptionViewModel.kt
└── di/
    ├── NetworkModule.kt
    ├── DatabaseModule.kt
    └── RepositoryModule.kt
```

### Key Libraries

```gradle
dependencies {
    // Compose
    implementation 'androidx.compose.ui:ui:1.5.4'
    implementation 'androidx.compose.material3:material3:1.1.2'
    implementation 'androidx.navigation:navigation-compose:2.7.5'

    // Networking
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.11.0'

    // Authentication
    implementation 'com.google.android.gms:play-services-auth:20.7.0'
    implementation 'com.facebook.android:facebook-login:16.1.3'

    // Local Storage
    implementation 'androidx.room:room-runtime:2.6.0'
    kapt 'androidx.room:room-compiler:2.6.0'
    implementation 'androidx.datastore:datastore-preferences:1.0.0'

    // Dependency Injection
    implementation 'com.google.dagger:hilt-android:2.48'
    kapt 'com.google.dagger:hilt-compiler:2.48'

    // Image Loading
    implementation 'io.coil-kt:coil-compose:2.5.0'

    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'

    // ViewModel
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2'
    implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.6.2'

    // Google Play Billing
    implementation 'com.android.billingclient:billing-ktx:6.1.0'
}
```

---

## Authentication Implementation

### Available Authentication Methods

The backend supports **three authentication providers**:

#### 1. Google OAuth
- **Provider ID:** `google`
- **Scopes:** email, profile, openid
- **Mobile Implementation:** Use Google Sign-In SDK for Android

#### 2. Facebook OAuth
- **Provider ID:** `facebook`
- **Scopes:** email, public_profile
- **Mobile Implementation:** Use Facebook Login SDK for Android

#### 3. Email/Password (Credentials)
- **Provider ID:** `credentials`
- **Features:**
  - Password hashing with bcrypt (12 rounds)
  - Minimum 8 characters required
  - Sign up via `/api/auth/signup`
  - Sign in via NextAuth CredentialsProvider

### Authentication Flow for Android

```
┌─────────────────┐
│  Android App    │
│                 │
│  1. User taps   │
│     "Sign in    │
│     with Google"│
└────────┬────────┘
         │
         │ 2. Launch Google Sign-In SDK
         │
┌────────▼────────────────────┐
│  Google OAuth Consent       │
│  - User approves            │
│  - Returns auth code        │
└────────┬────────────────────┘
         │
         │ 3. Exchange code for token
         │
┌────────▼────────────────────┐
│  Backend API                │
│  POST /api/auth/callback/   │
│  google                     │
│                             │
│  - Receives OAuth token     │
│  - Checks DynamoDB for      │
│    existing user (by email) │
│  - Creates OR links user    │
│  - Returns session token    │
└────────┬────────────────────┘
         │
         │ 4. Return JWT/session token
         │
┌────────▼────────┐
│  Android App    │
│  - Store token  │
│  - Navigate to  │
│    main screen  │
└─────────────────┘
```

### Implementation Code

**AuthRepository.kt:**
```kotlin
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val sessionManager: SessionManager
) {
    suspend fun signInWithGoogle(idToken: String): Result<User> {
        return try {
            val response = authApi.signInWithGoogle(GoogleSignInRequest(idToken))
            sessionManager.saveToken(response.token)
            Result.success(response.user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signInWithEmail(email: String, password: String): Result<User> {
        return try {
            val response = authApi.signInWithCredentials(
                CredentialsRequest(email, password)
            )
            sessionManager.saveToken(response.token)
            Result.success(response.user)
        } catch (e: HttpException) {
            when (e.code()) {
                401 -> Result.failure(InvalidCredentialsException())
                else -> Result.failure(e)
            }
        }
    }

    suspend fun signUp(
        email: String,
        password: String,
        firstName: String?,
        lastName: String?
    ): Result<User> {
        return try {
            val response = authApi.signUp(
                SignUpRequest(email, password, firstName, lastName)
            )
            // Auto sign-in after successful signup
            signInWithEmail(email, password)
        } catch (e: HttpException) {
            when (e.code()) {
                409 -> Result.failure(UserAlreadyExistsException())
                else -> Result.failure(e)
            }
        }
    }
}
```

**SessionManager.kt:**
```kotlin
class SessionManager @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    suspend fun saveToken(token: String) {
        dataStore.edit { preferences ->
            preferences[TOKEN_KEY] = token
        }
    }

    fun getToken(): Flow<String?> {
        return dataStore.data.map { preferences ->
            preferences[TOKEN_KEY]
        }
    }

    suspend fun clearSession() {
        dataStore.edit { preferences ->
            preferences.clear()
        }
    }

    companion object {
        private val TOKEN_KEY = stringPreferencesKey("auth_token")
    }
}
```

---

## Instagram Share Sheet Integration

### The Killer Feature ⭐

This is what differentiates Kinex Fit from all competitors - a **2-tap workflow** to save Instagram workouts.

### AndroidManifest.xml Configuration

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.CAMERA" />

    <application
        android:name=".SpotBuddyApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.SpotBuddy">

        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Share Intent Activity - KILLER FEATURE -->
        <activity
            android:name=".share.ShareActivity"
            android:label="@string/app_name"
            android:exported="true"
            android:theme="@style/Theme.Transparent">

            <!-- Handle image sharing from Instagram -->
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="image/*" />
            </intent-filter>

        </activity>

    </application>

</manifest>
```

### ShareActivity.kt

```kotlin
package com.spotbuddy.share

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import com.spotbuddy.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

@AndroidEntryPoint
class ShareActivity : ComponentActivity() {

    @Inject
    lateinit var shareProcessor: ShareProcessor

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        when {
            intent?.action == Intent.ACTION_SEND -> {
                if (intent.type?.startsWith("image/") == true) {
                    handleSharedImage(intent)
                }
            }
        }
    }

    private fun handleSharedImage(intent: Intent) {
        (intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM))?.let { imageUri ->

            // Save to app-specific directory
            val file = File(filesDir, "shared_workout_${System.currentTimeMillis()}.jpg")

            contentResolver.openInputStream(imageUri)?.use { input ->
                FileOutputStream(file).use { output ->
                    input.copyTo(output)
                }
            }

            // Launch main app with deep link
            val mainIntent = Intent(this, MainActivity::class.java).apply {
                action = "com.spotbuddy.IMPORT_WORKOUT"
                putExtra("image_path", file.absolutePath)
                putExtra("source", "share_instagram")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }

            startActivity(mainIntent)
            finish()
        }
    }
}
```

### User Experience Flow

1. **User sees workout on Instagram** → Tap "Share" button
2. **Android share sheet appears** → User selects "Kinex Fit"
3. **Kinex Fit opens instantly** → Shows "Processing workout..." screen
4. **OCR processes image** → Extracts exercise text via AWS Textract
5. **Review screen appears** → User can edit/confirm parsed exercises
6. **Tap "Save"** → Workout saved to library

**Total Time:** ~10-15 seconds from Instagram to saved workout

---

## Latest Features (December 2024)

### 🎯 Card Carousel Workout Session

**Status:** ✅ Deployed to production web app (December 2, 2024)
**Android Priority:** HIGH - Implement this UX pattern

The web app now features a revolutionary workout session experience based on UX research of leading fitness apps (Peloton, Nike Training Club). **Replicate this in Android.**

**Key Features:**
- **Card Carousel Navigation:** Current exercise displayed large and centered, adjacent exercises visible but smaller
- **One-Tap Completion:** No interrupting popups - tap "Complete Exercise" to advance
- **Auto-Advance Rest Timer:** Automatic transition between exercises with smart rest timer
- **Flow State Optimization:** Minimizes distractions during workouts
- **Session Duration Tracking:** Real-time elapsed time with persistence to DynamoDB
- **Workout Timer Integration:** Bottom bar displays EMOM/AMRAP/Tabata timers if configured
- **Completion Celebration:** Motivational celebration screen with workout summary

**UX Research Findings:**
- Users can't think clearly while exercising - minimize cognitive load
- Popups increase abandonment by 40%
- Micro-interactions increase engagement by 30%
- Limit workout tracking to 3 steps maximum

**Android Implementation with Jetpack Compose:**

```kotlin
@Composable
fun WorkoutSessionScreen(
    workoutId: String,
    viewModel: WorkoutSessionViewModel = hiltViewModel()
) {
    val workout by viewModel.workout.collectAsState()
    val currentExerciseIndex by viewModel.currentExerciseIndex.collectAsState()
    val completedExercises by viewModel.completedExercises.collectAsState()
    val sessionDuration by viewModel.sessionDuration.collectAsState()
    val showRestTimer by viewModel.showRestTimer.collectAsState()
    val restTimeRemaining by viewModel.restTimeRemaining.collectAsState()

    Scaffold(
        topBar = {
            // Progress bar with exercise count and session timer
            WorkoutSessionHeader(
                progress = completedExercises.size.toFloat() / workout.exercises.size,
                completedCount = completedExercises.size,
                totalCount = workout.exercises.size,
                sessionDuration = sessionDuration,
                onEndWorkout = { viewModel.showEndDialog() }
            )
        },
        bottomBar = {
            // Workout timer (EMOM/AMRAP/Tabata) if configured
            workout.timerConfig?.let { config ->
                WorkoutTimerBar(
                    params = config.params,
                    aiGenerated = config.aiGenerated ?: false,
                    reason = config.reason
                )
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Card carousel using HorizontalPager
            HorizontalPager(
                state = rememberPagerState(
                    initialPage = currentExerciseIndex,
                    pageCount = { workout.exercises.size }
                ),
                modifier = Modifier.fillMaxSize()
            ) { page ->
                ExerciseCard(
                    exercise = workout.exercises[page],
                    exerciseNumber = page + 1,
                    isCompleted = completedExercises.contains(workout.exercises[page].id),
                    isActive = page == currentExerciseIndex,
                    onComplete = { viewModel.completeExercise(page) }
                )
            }

            // Rest timer overlay
            if (showRestTimer) {
                RestTimerOverlay(
                    timeRemaining = restTimeRemaining,
                    onSkip = { viewModel.skipRest() }
                )
            }
        }
    }
}

@Composable
fun ExerciseCard(
    exercise: Exercise,
    exerciseNumber: Int,
    isCompleted: Boolean,
    isActive: Boolean,
    onComplete: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .graphicsLayer {
                // Scale down if not active (75% for adjacent cards)
                val scale = if (isActive) 1f else 0.75f
                scaleX = scale
                scaleY = scale
                alpha = if (isActive) 1f else 0.3f
            },
        colors = CardDefaults.cardColors(
            containerColor = if (isActive) {
                MaterialTheme.colorScheme.surfaceVariant
            } else {
                MaterialTheme.colorScheme.surface
            }
        ),
        border = if (isCompleted) {
            BorderStroke(2.dp, Color.Green)
        } else null
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            // Exercise number badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = exerciseNumber.toString(),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                }

                if (isCompleted) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Completed",
                            tint = Color.Green,
                            modifier = Modifier.size(24.dp)
                        )
                        Text(
                            text = "Complete",
                            color = Color.Green,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Exercise name
            Text(
                text = exercise.name,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Set details
            exercise.setDetails?.forEach { set ->
                SetDetailRow(set = set)
                Spacer(modifier = Modifier.height(8.dp))
            }

            // Rest time indicator
            exercise.restSeconds?.let { restSeconds ->
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Timer,
                        contentDescription = "Rest time",
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "${restSeconds}s rest",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Complete button (only for active, incomplete exercises)
            if (isActive && !isCompleted) {
                Button(
                    onClick = onComplete,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Complete Exercise",
                        style = MaterialTheme.typography.titleMedium
                    )
                }
            }
        }
    }
}
```

**ViewModel Implementation:**

```kotlin
@HiltViewModel
class WorkoutSessionViewModel @Inject constructor(
    private val workoutRepository: WorkoutRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    private val workoutId: String = checkNotNull(savedStateHandle["workoutId"])

    private val _workout = MutableStateFlow<Workout?>(null)
    val workout = _workout.asStateFlow()

    private val _currentExerciseIndex = MutableStateFlow(0)
    val currentExerciseIndex = _currentExerciseIndex.asStateFlow()

    private val _completedExercises = MutableStateFlow<Set<String>>(emptySet())
    val completedExercises = _completedExercises.asStateFlow()

    private val _sessionDuration = MutableStateFlow(0)
    val sessionDuration = _sessionDuration.asStateFlow()

    private val _showRestTimer = MutableStateFlow(false)
    val showRestTimer = _showRestTimer.asStateFlow()

    private val _restTimeRemaining = MutableStateFlow(0)
    val restTimeRemaining = _restTimeRemaining.asStateFlow()

    private var sessionStartTime: Long = 0
    private var sessionTimer: Job? = null
    private var restTimer: Job? = null

    init {
        loadWorkout()
        startSessionTimer()
    }

    private fun loadWorkout() {
        viewModelScope.launch {
            _workout.value = workoutRepository.getWorkout(workoutId)
        }
    }

    private fun startSessionTimer() {
        sessionStartTime = System.currentTimeMillis()
        sessionTimer = viewModelScope.launch {
            while (true) {
                delay(1000)
                _sessionDuration.value =
                    ((System.currentTimeMillis() - sessionStartTime) / 1000).toInt()
            }
        }
    }

    fun completeExercise(index: Int) {
        val exercise = _workout.value?.exercises?.get(index) ?: return

        // Mark exercise as completed
        _completedExercises.value = _completedExercises.value + exercise.id

        // Check if this was the last exercise
        if (index == (_workout.value?.exercises?.size ?: 0) - 1) {
            completeWorkout()
            return
        }

        // Show rest timer if configured
        val restSeconds = exercise.restSeconds
        if (restSeconds != null && restSeconds > 0) {
            startRestTimer(restSeconds)
        } else {
            // Move to next exercise
            _currentExerciseIndex.value = index + 1
        }
    }

    private fun startRestTimer(seconds: Int) {
        _restTimeRemaining.value = seconds
        _showRestTimer.value = true

        restTimer?.cancel()
        restTimer = viewModelScope.launch {
            while (_restTimeRemaining.value > 0) {
                delay(1000)
                _restTimeRemaining.value--
            }
            // Auto-advance when timer expires
            _showRestTimer.value = false
            _currentExerciseIndex.value++
        }
    }

    fun skipRest() {
        restTimer?.cancel()
        _showRestTimer.value = false
        _currentExerciseIndex.value++
    }

    private fun completeWorkout() {
        sessionTimer?.cancel()
        viewModelScope.launch {
            workoutRepository.completeWorkout(
                workoutId = workoutId,
                completedDate = LocalDate.now().toString(),
                completedAt = Instant.now().toString(),
                durationSeconds = _sessionDuration.value
            )
            // Show completion dialog
            _showCompletionDialog.value = true
        }
    }

    override fun onCleared() {
        super.onCleared()
        sessionTimer?.cancel()
        restTimer?.cancel()
    }
}
```

### 🤖 AI Timer Suggester

**Status:** ✅ Deployed to Production
**Android Priority:** MEDIUM

AI agent analyzes workout structure and suggests appropriate timer configurations using Claude Haiku.

**Supported Timer Types:**
1. **EMOM** (Every Minute On the Minute) - Fixed time intervals
2. **AMRAP** (As Many Rounds As Possible) - Maximum volume in fixed time
3. **INTERVAL_WORK_REST** - Circuit training, HIIT
4. **TABATA** - High-intensity intervals (20s work, 10s rest)

**Cost:** ~$0.00088 per suggestion (Haiku model)

**Android Implementation:**
- Display AI-suggested timer with "AI" badge
- Allow user to edit or change timer type
- Store `timerConfig` with workout
- Show timer in bottom bar during session

### 📊 Workout Completions Tracking

**Status:** ✅ API Endpoints Created
**Android Priority:** MEDIUM

New endpoints for tracking workout completion history separately from the main workout record.

**Benefits:**
- Track multiple completions of same workout
- Historical completion data for analytics
- Streak tracking and motivation
- Completion rate metrics
- Performance trends over time

**Android Implementation:**
- Display completion history on workout detail screen
- Show completion count badge on workout cards
- Chart completion trends in stats screen
- Push notification for streak milestones

---

## Implementation Phases

### Phase 1: Project Setup & Authentication (Week 1-2)

**1.1 Create Android Project**
```bash
# Android Studio
- New Project → Empty Compose Activity
- Package name: com.spotbuddy.android
- Minimum SDK: API 24 (Android 7.0)
- Kotlin DSL
```

**1.2 Configure Dependencies**
- Add Retrofit, Hilt, Room (see Key Libraries section)
- Configure ProGuard rules for release builds
- Set up build variants (debug, staging, production)

**1.3 Implement Authentication**
- Google Sign-In flow
- Email/Password sign-in and sign-up
- Session management with DataStore
- Token refresh on 401 responses

**1.4 Testing Checklist**
- [ ] Google Sign-In launches consent screen
- [ ] Google Sign-In returns to app with token
- [ ] Email sign-in validates credentials
- [ ] Sign-up creates new user
- [ ] Session persists across app restarts
- [ ] Logout clears session
- [ ] Duplicate email shows error

### Phase 2: Core Workout Features (Week 3-4)

**2.1 Workout Data Models**
```kotlin
data class Workout(
    val id: String,
    val userId: String,
    val title: String,
    val exercises: List<Exercise>,
    val duration: Int, // seconds
    val createdAt: String
)

data class Exercise(
    val id: String,
    val name: String,
    val sets: Int,
    val reps: String,
    val weight: String?,
    val restSeconds: Int?
)
```

**2.2 Workout Repository**
- Fetch workouts from API
- Cache locally with Room
- Optimistic updates
- Offline support

**2.3 Workout List UI**
- FlatList with search/filter
- Pull-to-refresh
- Swipe actions (delete, schedule, complete)

**2.4 Card Carousel Workout Session (NEW)**
- Implement HorizontalPager for card carousel
- One-tap completion
- Auto-advance rest timer
- Session duration tracking
- Completion celebration screen

**Testing Checklist:**
- [ ] Card carousel swipes smoothly
- [ ] Current card scales to 100%, adjacent cards to 75%
- [ ] One-tap completion works
- [ ] Rest timer displays and counts down
- [ ] Auto-advance after rest timer
- [ ] Skip rest button works
- [ ] Session timer updates every second
- [ ] Workout timer (bottom bar) displays if configured
- [ ] Completion celebration shows
- [ ] Duration saved to backend

### Phase 3: Instagram Share Sheet (Week 5 - KILLER FEATURE)

**3.1 ShareActivity Implementation**
- Create intent filter for image sharing
- Handle shared images from Instagram
- Save image to app directory
- Launch main app with deep link

**3.2 OCR Processing**
- Upload image to `/api/ocr`
- Process with AWS Textract
- Parse workout text
- Extract exercises, sets, reps

**3.3 OCR Review Screen**
- Display parsed exercises
- Allow manual editing
- Confidence scoring
- Save to library

**Testing Checklist:**
- [ ] Share from Instagram appears in share sheet
- [ ] Kinex Fit shows in share sheet
- [ ] Image saves correctly
- [ ] OCR processes image
- [ ] Exercises parsed correctly
- [ ] User can edit parsed data
- [ ] Save to library works

### Phase 4: Subscription Management (Week 6)

**4.1 Google Play Billing Integration**
```kotlin
// Configure products
- core_monthly: $8.99/month
- core_annual: $69.99/year
- pro_monthly: $13.99/month
- pro_annual: $109.99/year
- elite_monthly: $24.99/month
- elite_annual: $199.99/year
```

**4.2 Subscription UI**
- Display current tier and quota usage
- Feature comparison table
- Upgrade prompts
- Manage subscription via customer portal

**4.3 Feature Gating**
- Check subscription tier for features
- Block features for free users
- Show paywall when quota exceeded

**Testing Checklist:**
- [ ] Subscription tiers display correctly
- [ ] "Upgrade" button launches Play Billing
- [ ] Test payment completes (test product)
- [ ] Subscription updates in app
- [ ] Feature gates work correctly
- [ ] Quota limits enforced

### Phase 5: Advanced Features (Week 7-8)

**5.1 Calendar View**
- Monthly calendar with scheduled workouts
- Color-code by workout type
- Quick workout creation from calendar

**5.2 Stats & PRs**
- Calculate PRs from workout history
- Display PR trends over time
- Graphs for weight progression

**5.3 Body Metrics**
- Track weight, body fat, measurements
- Progress charts
- Camera for progress photos

**5.4 Offline Support**
- Queue API calls when offline
- Sync when connection restored
- Conflict resolution

### Phase 6: Testing & Polish (Week 9)

**6.1 Testing**
- Unit tests for repositories and use cases
- UI tests with Compose Test
- Integration tests for critical flows
- Beta testing with 10 users

**6.2 Polish**
- UI/UX improvements
- Animations
- Error handling
- Performance optimization

**6.3 Launch Preparation**
- Create Google Play Store listing
- Screenshots and feature graphic
- Privacy policy and terms of service
- Internal testing track

---

## API Endpoints Reference

### Authentication

**Sign Up**
```
POST /api/auth/signup
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}

Response (201):
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}

Errors:
409 - User already exists
400 - Invalid email/password
```

**Sign In with Credentials**
```
POST /api/auth/callback/credentials
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "subscriptionTier": "free"
  }
}

Errors:
401 - Invalid credentials
404 - User not found
```

**Get Current User**
```
GET /api/auth/session
Authorization: Bearer <token>

Response (200):
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "subscriptionTier": "core",
    "subscriptionStatus": "active",
    "scanQuotaUsed": 5,
    "scanQuotaLimit": 12,
    "ocrQuotaUsed": 2,
    "instagramImportsUsed": 3
  }
}
```

### Workouts

**Get All Workouts**
```
GET /api/workouts
Authorization: Bearer <token>

Response (200):
{
  "workouts": [
    {
      "id": "workout-uuid",
      "userId": "user-uuid",
      "title": "Chest & Triceps",
      "exercises": [...],
      "duration": 3600,
      "createdAt": "2024-12-27T10:00:00Z"
    }
  ]
}
```

**Create Workout**
```
POST /api/workouts
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "title": "Leg Day",
  "exercises": [
    {
      "name": "Squat",
      "sets": 4,
      "reps": "8-10",
      "weight": "225 lbs",
      "restSeconds": 120
    }
  ]
}

Response (201):
{
  "workout": {
    "id": "new-workout-uuid",
    ...
  }
}
```

**Update Workout**
```
PUT /api/workouts/:id
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "title": "Updated Name",
  "exercises": [...]
}

Response (200):
{
  "workout": {...}
}
```

**Delete Workout**
```
DELETE /api/workouts/:id
Authorization: Bearer <token>

Response (204):
No content
```

**Complete Workout (NEW - December 2024)**
```
POST /api/workouts/:id/complete
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "completedDate": "2024-12-27",
  "completedAt": "2024-12-27T18:30:00Z",
  "durationSeconds": 3600
}

Response (200):
{
  "success": true,
  "workoutId": "uuid",
  "completedDate": "2024-12-27",
  "completedAt": "2024-12-27T18:30:00Z",
  "durationSeconds": 3600,
  "status": "completed"
}
```

**Get Workout Completions (NEW - December 2024)**
```
GET /api/workouts/:id/completions
Authorization: Bearer <token>

Response (200):
{
  "completions": [
    {
      "completionId": "uuid",
      "workoutId": "uuid",
      "completedAt": "2024-12-27T18:30:00Z",
      "durationSeconds": 3600,
      "notes": "Felt strong today"
    }
  ]
}
```

**Create Workout Completion (NEW - December 2024)**
```
POST /api/workouts/:id/completions
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "completedAt": "2024-12-27T18:30:00Z",
  "durationSeconds": 3600,
  "notes": "Personal best on squats!"
}

Response (201):
{
  "completion": {
    "completionId": "uuid",
    "workoutId": "uuid",
    "completedAt": "2024-12-27T18:30:00Z",
    "durationSeconds": 3600
  }
}
```

**Get Completion Stats (NEW - December 2024)**
```
GET /api/workouts/completions/stats
Authorization: Bearer <token>

Response (200):
{
  "totalCompletions": 150,
  "last30Days": 12,
  "last7Days": 4,
  "averageDuration": 3200,
  "longestWorkout": 5400,
  "shortestWorkout": 1200,
  "currentStreak": 7,
  "longestStreak": 14,
  "totalMinutes": 480000
}
```

### OCR & Import

**Process Image (OCR)**
```
POST /api/ocr
Authorization: Bearer <token>
Content-Type: multipart/form-data

Request:
{
  "image": <file>,
  "userId": "user-uuid"
}

Response (200):
{
  "text": "Bench Press\n3x8 @ 185 lbs\n...",
  "confidence": 0.92,
  "processingTime": 2340
}
```

### Subscriptions

**Get Subscription Status**
```
GET /api/stripe/subscription
Authorization: Bearer <token>

Response (200):
{
  "tier": "core",
  "status": "active",
  "currentPeriodEnd": "2024-12-30T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

**Create Mobile Checkout Session**
```
POST /api/mobile/checkout
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "tier": "core" // or "pro", "elite"
}

Response (200):
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_..."
}
```

---

## Testing Strategy

### Unit Testing

**Tools:**
- JUnit 5
- MockK (Kotlin mocking)
- Coroutines Test
- Truth (assertions)

**Coverage Targets:**
- Repositories: 90%+
- ViewModels: 85%+
- Use Cases: 90%+

**Example Test:**
```kotlin
@Test
fun `getWorkouts fetches from API when cache is empty`() = runTest {
    // Given
    coEvery { workoutDao.getWorkoutCount() } returns 0
    coEvery { workoutApi.getWorkouts() } returns listOf(mockWorkoutDto)

    // When
    val result = workoutRepository.getWorkouts()

    // Then
    assertEquals(1, result.size)
    coVerify { workoutApi.getWorkouts() }
    coVerify { workoutDao.insertAll(any()) }
}
```

### Integration Testing

**Test Scenarios:**
- [ ] Sign up → Sign in → Fetch workouts
- [ ] Create workout → Sync to API → Verify in database
- [ ] Go offline → Create workout → Come online → Verify sync
- [ ] Upgrade subscription → Verify tier change

### UI Testing

**Tools:**
- Compose Test
- Screenshot testing

**Test Scenarios:**
- [ ] Login flow completes successfully
- [ ] Workout list displays and scrolls
- [ ] Create workout form validation works
- [ ] Subscription upgrade opens billing

### Manual Testing Checklist

**Authentication:**
- [ ] Google Sign-In works
- [ ] Email/Password sign-up works
- [ ] Email/Password sign-in works
- [ ] Session persists across app restarts
- [ ] Logout clears session

**Workouts:**
- [ ] Workouts load from API
- [ ] Create workout syncs
- [ ] Update workout syncs
- [ ] Delete workout syncs
- [ ] Offline mode shows cached data
- [ ] Pull-to-refresh updates data

**Instagram Share:**
- [ ] Share from Instagram works
- [ ] OCR processes image correctly
- [ ] Parsed exercises editable
- [ ] Save to library works

**Subscriptions:**
- [ ] Free tier shows correct quotas
- [ ] Upgrade opens Play Billing
- [ ] Payment completes (test mode)
- [ ] Tier updates in app
- [ ] Feature gates work

---

## Deployment & Launch

### Pre-Deployment Checklist

**Code Quality:**
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] UI tests passing
- [ ] Code review completed
- [ ] ProGuard rules configured

**Security:**
- [ ] API keys in `local.properties` (not committed)
- [ ] HTTPS only for API calls
- [ ] Authentication tokens encrypted
- [ ] No secrets in code or resources

**Performance:**
- [ ] App size < 50MB
- [ ] Cold start < 3 seconds
- [ ] Network requests optimized
- [ ] Images compressed
- [ ] Database queries indexed

**Compliance:**
- [ ] Privacy policy added
- [ ] Terms of service added
- [ ] Play Store guidelines reviewed

### Google Play Console Setup

**1. Create App Listing**
- App name: "Kinex Fit"
- Short description (80 chars)
- Full description (4000 chars)
- Screenshots (at least 2 phone, 1 tablet)
- Feature graphic (1024x500)
- App icon (512x512)

**2. Content Rating**
- Complete questionnaire
- Expected: "Everyone" or "Teen"

**3. Pricing & Distribution**
- Free to download
- In-app purchases: Yes (subscriptions via Google Play Billing)
- Countries: Worldwide (or US-only initially)

**4. Release Tracks**
- Internal testing (first)
- Closed testing (beta - 2-3 weeks target)
- Open testing (public beta)
- Production (launch)

### Build Configuration

**build.gradle (app):**
```gradle
android {
    compileSdk 34

    defaultConfig {
        applicationId "com.spotbuddy.android"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }

    signingConfigs {
        release {
            storeFile file(RELEASE_STORE_FILE)
            storePassword RELEASE_STORE_PASSWORD
            keyAlias RELEASE_KEY_ALIAS
            keyPassword RELEASE_KEY_PASSWORD
        }
    }

    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release

            buildConfigField "String", "API_URL", "\"https://kinexfit.com\""
        }
        debug {
            applicationIdSuffix ".debug"
            buildConfigField "String", "API_URL", "\"http://localhost:3000\""
        }
    }
}
```

### Release Build

```bash
# Clean build
./gradlew clean

# Build release bundle (for Play Store)
./gradlew bundleRelease

# Output: app/build/outputs/bundle/release/app-release.aab
```

### Post-Deployment

**Monitoring:**
- [ ] Set up Crashlytics (Firebase)
- [ ] Configure analytics
- [ ] Monitor ANR rate
- [ ] Track API error rates
- [ ] Monitor subscription conversion rates

**User Feedback:**
- [ ] Enable in-app rating prompts
- [ ] Monitor Play Store reviews
- [ ] Set up support email
- [ ] Create FAQ/Help documentation

---

## Timeline & Budget

### Development Timeline (90 Days to Full MVP)

#### Phase 1: Foundation (Days 1-14)
- [ ] Set up Android Studio on Windows 11
- [ ] Create Android project (Kotlin + Jetpack Compose)
- [ ] Configure Gradle dependencies
- [ ] Implement login/signup screens
- [ ] Integrate authentication
- [ ] Test API connectivity

#### Phase 2: Share Integration (Days 15-28)
- [ ] Create ShareActivity with intent filter
- [ ] Handle image sharing from Instagram
- [ ] Build image preprocessing
- [ ] Test share flow with Instagram

#### Phase 3: OCR & Parsing (Days 29-49)
- [ ] Integrate AWS Textract API
- [ ] Build WorkoutParser
- [ ] Create OCRReviewScreen
- [ ] Test with 50+ real screenshots

#### Phase 4: Core Features (Days 50-70)
- [ ] Build workout list screen
- [ ] Create workout detail screen
- [ ] **Implement card carousel workout session** (NEW)
- [ ] Implement Room database for offline
- [ ] Add workout sync logic

#### Phase 5: Subscriptions (Days 71-84)
- [ ] Integrate Google Play Billing
- [ ] Build paywall screen
- [ ] Implement feature gating
- [ ] Test purchase flow

#### Phase 6: Launch (Days 85-90)
- [ ] Polish UI/UX
- [ ] Fix bugs from testing
- [ ] **Beta testing (2-3 weeks target)**
- [ ] Launch to Google Play internal track

### Budget

**One-Time:**
- Google Play Developer: $25 (one-time)
- **Total:** $25

**Monthly (MVP - Android Only):**
- AWS: $150-250
- Domain: $1
- **Total:** ~$200/month

**Monthly (After AI Features):**
- AWS: $300-500
- AI (Bedrock): $100-300
- Marketing: $500
- **Total:** ~$1,000-1,300/month

### Success Metrics

**Beta Test Goals (2-3 Weeks):**
- 20-30 beta testers
- < 5 critical bugs
- 4.0+ feedback rating
- Instagram share sheet works flawlessly

**30-Day Goals:**
- 500 downloads
- 250 active users (50% activation)
- 15 paying customers (6% conversion)
- $120 MRR
- 4.0+ Play Store rating

**90-Day Goals:**
- 2,000 downloads
- 1,000 active users
- 50 paying customers
- $500 MRR

---

## Subscription Tiers (All Platforms)

### Free Tier
- Monthly limits (scans/AI)
- 90-day history
- Basic tracking only

### Core - $8.99/month or $69.99/year
- Unlimited workouts
- 12 scans/month (Instagram + OCR)
- Full history
- 10 AI requests/month
- Automatic PR detection
- Body metrics tracking

### Pro - $13.99/month or $109.99/year
- 60 scans/month (Instagram + OCR)
- 30 AI requests/month
- Advanced analytics
- All timers

### Elite - $24.99/month or $199.99/year
- 120 scans/month (Instagram + OCR)
- 100 AI requests/month
- Priority support
- Early access

---

## Reusable Business Logic Reference

While this is a separate Android project, the web app contains valuable business logic that can be ported to Kotlin. For reference, these TypeScript modules contain pure logic with no React dependencies:

**Workout Parsing:**
- `src/lib/smartWorkoutParser.ts` - Exercise database (100+ exercises), workout structure detection
- `src/lib/igParser.ts` - Instagram content extraction logic

**Calculations:**
- `src/lib/pr-calculator.ts` - 7 different 1RM calculation formulas (Brzycki, Epley, etc.)
- `src/lib/exercise-history.ts` - Volume calculations, muscle group categorization
- `src/lib/body-metrics.ts` - BMI calculation, weight/measurement conversions

**Type Definitions:**
- `src/lib/dynamodb.ts` - User, Workout, BodyMetric interfaces
- `src/lib/training-profile.ts` - Training profile schema, equipment options, goals

**Feature Gating:**
- `src/lib/feature-gating.tsx` - Subscription tier definitions, quota limits

These can be ported to Kotlin equivalents when building the Android app. The TypeScript code is well-documented and can serve as a specification.

---

## Resources & Support

### Documentation
- **Kinex Fit Web App:** https://kinexfit.com
- **Stripe Mobile Integration:** https://docs.stripe.com/mobile
- **Android Developers Guide:** https://developer.android.com
- **Jetpack Compose Docs:** https://developer.android.com/jetpack/compose

### Backend Docs in `/docs`
- `EMAIL-PASSWORD-AUTH-SETUP.md` - Authentication system details
- `STRIPE-SETUP.md` - Stripe integration guide
- `MONITORING-GUIDE.md` - Backend monitoring

### Tools
- **Android Studio:** Arctic Fox or later
- **Postman:** API testing
- **Firebase Console:** Analytics and Crashlytics
- **Stripe Dashboard:** Subscription management

---

## Next Steps - Getting Started

### Setup on Windows 11

```bash
# 1. Install Android Studio
# Download: https://developer.android.com/studio

# 2. Install Java Development Kit (JDK)
winget install Oracle.JDK.17

# 3. Configure Android SDK
# Open Android Studio → SDK Manager → Install:
# - Android SDK Platform 34
# - Android SDK Build-Tools
# - Android Emulator

# 4. Create Android project
# File → New → New Project
# Select "Empty Activity"
# Language: Kotlin
# Minimum SDK: API 24 (Android 7.0)
# Build configuration: Kotlin DSL
```

### First Implementation Tasks

1. **Create ShareActivity** - Start with the Instagram share sheet integration
2. **Test Share Flow** - Verify images are received from Instagram
3. **Implement Authentication** - Get Google Sign-In working
4. **Connect to Backend API** - Test API calls with bearer token

---

## Conclusion

This guide consolidates all Android development documentation into a single source of truth for building the Kinex Fit Android app as a **separate project**.

**Key Takeaways:**

✅ Backend is 100% production-ready
✅ Instagram share sheet is the killer differentiator
✅ Native Kotlin + Jetpack Compose for best performance
✅ Card carousel workout session (December 2024 UX innovation)
✅ AI features ready via existing API endpoints
✅ 90-day timeline to full MVP
✅ Beta test target: 2-3 weeks

**Development Tools:**
- Android Studio on Windows 11
- Claude Code for coding assistance
- ChatGPT Codex for coding assistance

**Ready to start building! 🚀**
