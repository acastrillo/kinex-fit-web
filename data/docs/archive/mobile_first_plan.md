# Kinex Fit - Multi-Platform Development Plan

**Version**: 3.0 (Three Separate Projects Strategy)
**Created**: October 20, 2025
**Status**: Android Development Priority

---

## Executive Summary

**Three Independent Projects**:
1. **Web App** (Existing) - Add AI features only
2. **Android App** (NEW) - Native development with share sheet
3. **iOS App** (NEW) - Native development with share sheet (later)

**Shared Backend**: All three apps use the same AWS infrastructure (DynamoDB, Cognito, Textract, Stripe)

**Development Priority**: Android First → Web AI → iOS

---

## Project 1: Web App (Maintenance + AI)

### Current Status
✅ **Phase 1-5 Complete**:
- Authentication (AWS Cognito)
- Workout CRUD operations
- Instagram URL parser (existing method)
- Screenshot OCR upload (Tesseract.js → AWS Textract)
- Calendar & scheduling
- Smart timers (Interval, HIIT, Rest)
- Stats & PRs tracking
- Body metrics
- Subscription tiers (Stripe)

### Planned Work: Phase 6 - AI Features

**What We're Adding** (Post-Android launch):
1. AI Workout Enhancement
   - "Enhance with AI" button after OCR
   - Clean up messy text
   - Standardize exercise names
   - Suggest weights based on PRs
   - Add form cues

2. Training Profile
   - Manual PR entry
   - Goals, equipment, preferences
   - Experience level
   - Training focus

3. AI Workout Generator
   - Generate custom workouts from text prompt
   - "Upper body, dumbbells, 45 minutes"
   - Personalized based on training profile

4. Workout of the Day (WOD)
   - Free: Generic WOD (same for everyone)
   - Pro/Elite: Personalized WOD

**What Stays the Same**:
- Instagram URL parser (paste URL → parse caption)
- Screenshot OCR upload (upload image → OCR → parse)
- All existing features remain unchanged
- Next.js deployment on AWS ECS

**Timeline**: Phase 6 starts AFTER Android MVP launches

---

## Project 2: Android App (NEW - PRIMARY FOCUS)

### Tech Stack
- **Native Android** (Kotlin)
- Jetpack Compose (modern UI)
- Android Studio on Windows 11
- Material Design 3
- Retrofit (API client)
- Room Database (local storage/offline)
- Hilt (dependency injection)
- Coroutines + Flow (async)

### Unique Features
1. **Instagram Share Integration** ⭐
   - Native Android intent filter
   - Share from Instagram → Kinex Fit
   - 2-tap workflow (Share → Open app)
   - No Instagram ToS violations

2. **Native Android Features**
   - Material Design 3 UI
   - Haptic feedback
   - Android widgets (future)
   - Native notifications
   - Offline-first architecture

### Architecture

```
kinex-fit-android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/cannashieldct/spotbuddy/
│   │   │   │   ├── ui/
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── LoginScreen.kt
│   │   │   │   │   │   └── SignupScreen.kt
│   │   │   │   │   ├── home/
│   │   │   │   │   │   ├── HomeScreen.kt
│   │   │   │   │   │   └── WorkoutCard.kt
│   │   │   │   │   ├── add/
│   │   │   │   │   │   ├── AddWorkoutScreen.kt
│   │   │   │   │   │   ├── OCRReviewScreen.kt
│   │   │   │   │   │   └── WorkoutEditorScreen.kt
│   │   │   │   │   ├── workouts/
│   │   │   │   │   │   ├── WorkoutsListScreen.kt
│   │   │   │   │   │   └── WorkoutDetailScreen.kt
│   │   │   │   │   ├── stats/
│   │   │   │   │   │   ├── StatsScreen.kt
│   │   │   │   │   │   └── PRsScreen.kt
│   │   │   │   │   ├── settings/
│   │   │   │   │   │   ├── SettingsScreen.kt
│   │   │   │   │   │   └── SubscriptionScreen.kt
│   │   │   │   │   └── paywall/
│   │   │   │   │       └── PaywallScreen.kt
│   │   │   │   ├── data/
│   │   │   │   │   ├── api/
│   │   │   │   │   │   ├── ApiService.kt
│   │   │   │   │   │   ├── AuthApi.kt
│   │   │   │   │   │   ├── WorkoutApi.kt
│   │   │   │   │   │   └── OCRApi.kt
│   │   │   │   │   ├── model/
│   │   │   │   │   │   ├── Workout.kt
│   │   │   │   │   │   ├── Exercise.kt
│   │   │   │   │   │   └── User.kt
│   │   │   │   │   ├── repository/
│   │   │   │   │   │   ├── WorkoutRepository.kt
│   │   │   │   │   │   ├── AuthRepository.kt
│   │   │   │   │   │   └── OCRRepository.kt
│   │   │   │   │   └── local/
│   │   │   │   │       ├── AppDatabase.kt
│   │   │   │   │       └── WorkoutDao.kt
│   │   │   │   ├── domain/
│   │   │   │   │   ├── usecase/
│   │   │   │   │   │   ├── ProcessOCRUseCase.kt
│   │   │   │   │   │   ├── SaveWorkoutUseCase.kt
│   │   │   │   │   │   └── SyncWorkoutsUseCase.kt
│   │   │   │   │   └── model/
│   │   │   │   │       └── ParsedWorkout.kt
│   │   │   │   ├── share/
│   │   │   │   │   ├── ShareActivity.kt
│   │   │   │   │   └── ShareProcessor.kt
│   │   │   │   ├── ocr/
│   │   │   │   │   ├── OCRService.kt
│   │   │   │   │   └── WorkoutParser.kt
│   │   │   │   ├── subscription/
│   │   │   │   │   ├── BillingManager.kt
│   │   │   │   │   └── SubscriptionChecker.kt
│   │   │   │   └── util/
│   │   │   │       ├── Constants.kt
│   │   │   │       └── Extensions.kt
│   │   │   └── AndroidManifest.xml
│   │   └── test/
│   └── build.gradle.kts
├── gradle/
├── build.gradle.kts
└── settings.gradle.kts
```

### Core Components

#### 1. Share Intent Handler

**AndroidManifest.xml**:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.CAMERA" />
    
    <application
        android:name=".KinexFitApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.KinexFit">
        
        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.KinexFit">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
        <!-- Share Intent Activity -->
        <activity
            android:name=".share.ShareActivity"
            android:label="@string/app_name"
            android:exported="true"
            android:theme="@style/Theme.Transparent">
            
            <!-- Handle image sharing from Instagram, TikTok, etc -->
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="image/*" />
            </intent-filter>
            
        </activity>
        
    </application>
    
</manifest>
```

**ShareActivity.kt**:
```kotlin
package com.cannashieldct.spotbuddy.share

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.cannashieldct.spotbuddy.MainActivity
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
                action = "com.cannashieldct.spotbuddy.IMPORT_WORKOUT"
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

**ShareProcessor.kt**:
```kotlin
package com.cannashieldct.spotbuddy.share

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.cannashieldct.spotbuddy.data.api.OCRApi
import com.cannashieldct.spotbuddy.ocr.WorkoutParser
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ShareProcessor @Inject constructor(
    @ApplicationContext private val context: Context,
    private val ocrApi: OCRApi,
    private val workoutParser: WorkoutParser
) {
    
    suspend fun processSharedImage(imagePath: String): Result<ParsedWorkout> = withContext(Dispatchers.IO) {
        try {
            // 1. Load image
            val bitmap = BitmapFactory.decodeFile(imagePath)
            
            // 2. Preprocess image (enhance contrast, etc)
            val processedBitmap = preprocessImage(bitmap)
            
            // 3. Upload to S3 and trigger Textract
            val ocrResult = ocrApi.processImage(processedBitmap)
            
            // 4. Parse workout from OCR text
            val parsedWorkout = workoutParser.parse(ocrResult.text)
            
            // 5. Clean up temp file
            File(imagePath).delete()
            
            Result.success(parsedWorkout)
            
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private fun preprocessImage(bitmap: Bitmap): Bitmap {
        // Image enhancement logic
        // - Increase contrast
        // - Convert to grayscale
        // - Sharpen edges
        return bitmap
    }
}

data class ParsedWorkout(
    val title: String?,
    val exercises: List<Exercise>,
    val confidence: Float
)

data class Exercise(
    val name: String,
    val sets: Int?,
    val reps: String?,
    val weight: String?,
    val notes: String?
)
```

#### 2. OCR Service

**OCRApi.kt**:
```kotlin
package com.cannashieldct.spotbuddy.data.api

import android.graphics.Bitmap
import retrofit2.http.Body
import retrofit2.http.POST
import java.io.ByteArrayOutputStream
import javax.inject.Inject
import javax.inject.Singleton

interface OCRApi {
    
    @POST("api/ocr/process")
    suspend fun processImage(@Body request: OCRRequest): OCRResponse
}

data class OCRRequest(
    val imageData: String,  // Base64 encoded
    val userId: String
)

data class OCRResponse(
    val text: String,
    val confidence: Float,
    val processingTime: Long
)

@Singleton
class OCRService @Inject constructor(
    private val ocrApi: OCRApi
) {
    
    suspend fun processImage(bitmap: Bitmap, userId: String): OCRResponse {
        // Convert bitmap to base64
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream)
        val base64Image = android.util.Base64.encodeToString(
            outputStream.toByteArray(),
            android.util.Base64.DEFAULT
        )
        
        // Call API
        return ocrApi.processImage(OCRRequest(base64Image, userId))
    }
}
```

**WorkoutParser.kt**:
```kotlin
package com.cannashieldct.spotbuddy.ocr

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WorkoutParser @Inject constructor() {
    
    private val exerciseDatabase = listOf(
        "bench press", "squat", "deadlift", "overhead press",
        "barbell row", "pull up", "chin up", "dip",
        "bicep curl", "tricep extension", "lateral raise",
        "leg press", "leg curl", "leg extension", "calf raise",
        "dumbbell press", "dumbbell row", "dumbbell fly",
        "cable fly", "cable row", "lat pulldown",
        // ... 100+ exercises
    )
    
    fun parse(text: String): ParsedWorkout {
        val lines = text.split("\n").filter { it.trim().isNotEmpty() }
        val exercises = mutableListOf<Exercise>()
        
        var currentExercise: Exercise? = null
        
        for (line in lines) {
            val cleanLine = line.trim().lowercase()
            
            // Check if line contains exercise name
            val exerciseName = findExerciseName(cleanLine)
            
            if (exerciseName != null) {
                // Save previous exercise
                currentExercise?.let { exercises.add(it) }
                
                // Start new exercise
                currentExercise = Exercise(
                    name = exerciseName,
                    sets = null,
                    reps = null,
                    weight = null,
                    notes = null
                )
                
                // Try to extract workout details from same line
                extractWorkoutDetails(cleanLine, currentExercise)
                
            } else if (currentExercise != null) {
                // Extract details from this line
                extractWorkoutDetails(cleanLine, currentExercise)
            }
        }
        
        // Add last exercise
        currentExercise?.let { exercises.add(it) }
        
        // Calculate confidence
        val confidence = calculateConfidence(exercises)
        
        return ParsedWorkout(
            title = null,
            exercises = exercises,
            confidence = confidence
        )
    }
    
    private fun findExerciseName(line: String): String? {
        // Check exact match
        for (exercise in exerciseDatabase) {
            if (line.contains(exercise)) {
                return exercise.split(" ").joinToString(" ") { 
                    it.replaceFirstChar { c -> c.uppercase() } 
                }
            }
        }
        
        // Check abbreviations
        val abbreviations = mapOf(
            "db" to "dumbbell",
            "bb" to "barbell",
            "bp" to "bench press",
            "ohp" to "overhead press",
            "dl" to "deadlift"
        )
        
        for ((abbr, full) in abbreviations) {
            if (line.contains(abbr)) {
                return full.split(" ").joinToString(" ") { 
                    it.replaceFirstChar { c -> c.uppercase() } 
                }
            }
        }
        
        return null
    }
    
    private fun extractWorkoutDetails(line: String, exercise: Exercise) {
        // Extract sets: "3 sets", "3x", "3 x"
        if (exercise.sets == null) {
            val setsRegex = """(\d+)\s*(?:sets?|x)""".toRegex()
            setsRegex.find(line)?.let {
                exercise.sets = it.groupValues[1].toInt()
            }
        }
        
        // Extract reps: "10 reps", "x10", "8-12"
        if (exercise.reps == null) {
            val repsRegex = """(?:x\s*)?(\d+(?:-\d+)?)\s*(?:reps?)?""".toRegex()
            repsRegex.find(line)?.let {
                exercise.reps = it.groupValues[1]
            }
        }
        
        // Extract weight: "135 lbs", "60kg"
        if (exercise.weight == null) {
            val weightRegex = """(\d+)\s*(lbs?|kg|pounds?|kilos?)""".toRegex()
            weightRegex.find(line)?.let {
                exercise.weight = "${it.groupValues[1]} ${it.groupValues[2]}"
            }
        }
    }
    
    private fun calculateConfidence(exercises: List<Exercise>): Float {
        if (exercises.isEmpty()) return 0f
        
        var totalScore = 0f
        
        exercises.forEach { exercise ->
            var score = 0f
            if (exercise.name.length > 2) score += 0.3f
            if (exercise.sets != null && exercise.sets > 0) score += 0.3f
            if (exercise.reps != null) score += 0.2f
            if (exercise.weight != null) score += 0.2f
            totalScore += score
        }
        
        return totalScore / exercises.size
    }
}

data class Exercise(
    val name: String,
    var sets: Int?,
    var reps: String?,
    var weight: String?,
    var notes: String?
)
```

#### 3. Subscription Management

**BillingManager.kt**:
```kotlin
package com.cannashieldct.spotbuddy.subscription

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BillingManager @Inject constructor(
    @ApplicationContext private val context: Context
) : PurchasesUpdatedListener {
    
    private val _subscriptionTier = MutableStateFlow<SubscriptionTier>(SubscriptionTier.FREE)
    val subscriptionTier: StateFlow<SubscriptionTier> = _subscriptionTier
    
    private lateinit var billingClient: BillingClient
    
    fun initialize() {
        billingClient = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases()
            .build()
        
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    queryPurchases()
                }
            }
            
            override fun onBillingServiceDisconnected() {
                // Retry connection
            }
        })
    }
    
    private fun queryPurchases() {
        billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        ) { result, purchases ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                processPurchases(purchases)
            }
        }
    }
    
    private fun processPurchases(purchases: List<Purchase>) {
        val activeSubs = purchases.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
        
        _subscriptionTier.value = when {
            activeSubs.any { it.products.contains("elite_monthly") || it.products.contains("elite_annual") } -> 
                SubscriptionTier.ELITE
            activeSubs.any { it.products.contains("pro_monthly") || it.products.contains("pro_annual") } -> 
                SubscriptionTier.PRO
            activeSubs.any { it.products.contains("core_monthly") || it.products.contains("core_annual") } -> 
                SubscriptionTier.CORE
            else -> SubscriptionTier.FREE
        }
    }
    
    suspend fun launchPurchaseFlow(activity: Activity, productId: String) {
        // Query product details
        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        )
        
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()
        
        billingClient.queryProductDetailsAsync(params) { result, productDetailsList ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK && productDetailsList.isNotEmpty()) {
                val productDetails = productDetailsList[0]
                
                val offerToken = productDetails.subscriptionOfferDetails?.get(0)?.offerToken
                
                val productParamsBuilder = BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(productDetails)
                
                offerToken?.let {
                    productParamsBuilder.setOfferToken(it)
                }
                
                val flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(listOf(productParamsBuilder.build()))
                    .build()
                
                billingClient.launchBillingFlow(activity, flowParams)
            }
        }
    }
    
    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        if (result.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            processPurchases(purchases)
        }
    }
    
    fun hasFeature(feature: Feature): Boolean {
        return when (feature) {
            Feature.UNLIMITED_WORKOUTS -> _subscriptionTier.value != SubscriptionTier.FREE
            Feature.UNLIMITED_OCR -> _subscriptionTier.value in listOf(SubscriptionTier.PRO, SubscriptionTier.ELITE)
            Feature.AI_FEATURES -> _subscriptionTier.value != SubscriptionTier.FREE
            Feature.AI_COACH -> _subscriptionTier.value == SubscriptionTier.ELITE
            Feature.CREW_FEATURES -> _subscriptionTier.value == SubscriptionTier.ELITE
        }
    }
}

enum class SubscriptionTier {
    FREE, CORE, PRO, ELITE
}

enum class Feature {
    UNLIMITED_WORKOUTS,
    UNLIMITED_OCR,
    AI_FEATURES,
    AI_COACH,
    CREW_FEATURES
}
```

### Android Development Timeline (90 Days)

#### Phase 1: Foundation (Days 1-14)
- [ ] Set up Android Studio on Windows 11
- [ ] Create Android project (Kotlin + Jetpack Compose)
- [ ] Configure Gradle dependencies
- [ ] Set up Hilt dependency injection
- [ ] Implement Material Design 3 theme
- [ ] Create navigation graph
- [ ] Build login/signup screens
- [ ] Integrate AWS Cognito authentication
- [ ] Test API connectivity to existing backend

#### Phase 2: Share Integration (Days 15-28)
- [ ] Create ShareActivity with intent filter
- [ ] Handle image sharing from Instagram
- [ ] Implement deep link handling
- [ ] Test share flow with Instagram/TikTok
- [ ] Build image preprocessing
- [ ] Create loading/progress UI

#### Phase 3: OCR & Parsing (Days 29-49)
- [ ] Integrate existing AWS Textract API
- [ ] Build WorkoutParser
- [ ] Create OCRReviewScreen
- [ ] Implement manual editing
- [ ] Add confidence scoring
- [ ] Test with 50+ real Instagram screenshots

#### Phase 4: Core Features (Days 50-70)
- [ ] Build workout list screen
- [ ] Create workout detail screen
- [ ] Implement workout logging
- [ ] Add exercise library
- [ ] Build manual workout creation
- [ ] Implement Room database for offline
- [ ] Add workout sync logic

#### Phase 5: Subscriptions (Days 71-84)
- [ ] Integrate Google Play Billing
- [ ] Build paywall screen
- [ ] Implement feature gating
- [ ] Track OCR quota (1/week free, 5/week core)
- [ ] Track workout limit (15 max free)
- [ ] Add upgrade prompts
- [ ] Test purchase flow

#### Phase 6: Launch (Days 85-90)
- [ ] Polish UI/UX
- [ ] Add animations
- [ ] Implement error handling
- [ ] Fix bugs from testing
- [ ] Create Google Play Store listing
- [ ] Internal testing with 10 users
- [ ] Launch to Google Play

---

## Project 3: iOS App (Later - Similar to Android)

### Tech Stack
- **Native iOS** (Swift)
- SwiftUI (modern UI)
- Xcode (requires Mac or EAS Build)
- Combine (reactive)
- URLSession (API client)
- Core Data (local storage)

### Timeline
Start iOS development AFTER Android launch (Month 4+)

---

## Shared Backend (All Three Apps)

### AWS Infrastructure (Existing)
- **ECS Fargate**: Next.js API routes
- **DynamoDB**: User data, workouts, PRs, body metrics
- **S3**: Image storage for OCR
- **Lambda**: Image preprocessing, OCR orchestration
- **Textract**: OCR processing
- **Cognito**: Authentication (all platforms)
- **API Gateway**: RESTful API

### Payment Processing
- **Web**: Stripe Checkout
- **Android**: Google Play Billing → Stripe backend sync
- **iOS**: Apple In-App Purchase → Stripe backend sync

### Subscription Sync
All three platforms share same subscription status via backend:
```
User subscribes on Android
  → Google Play Billing processes payment
  → Android app calls POST /api/subscription/sync
  → Backend updates DynamoDB user record
  → Web app sees updated subscription
  → iOS app sees updated subscription
```

---

## Updated Pricing Tiers (All Platforms)

### Free Tier
- 15 workouts max
- 1 OCR scan/week
- 30-day history
- No AI features
- Ads (mobile only)

### Core - $7.99/month or $79.99/year
- Unlimited workouts
- 5 OCR scans/week
- Full history
- No ads
- 10 AI enhancements/month (Phase 6)
- Automatic PR detection
- Body metrics tracking

### Pro - $14.99/month or $149.99/year
- Unlimited OCR scans
- 30 AI enhancements/month
- 30 AI generations/month
- Personalized WOD daily
- Advanced analytics
- Progress photos (unlimited)
- All timers

### Elite - $34.99/month or $349.99/year
- 100 AI enhancements/month
- 100 AI generations/month
- AI Coach (Phase 7) - 20 messages/day
- Crew features (Phase 8)
- Priority support
- Early access

---

## Development Priorities

### Immediate (Next 90 Days)
1. **Android MVP** - Share sheet + OCR + basic tracking
2. Focus 100% on Android development
3. Web maintenance mode (bug fixes only)

### Month 4-6
1. **Web Phase 6** - AI features
2. **Android refinement** - Based on user feedback
3. **iOS planning** - Begin iOS development

### Month 7-9
1. **iOS MVP** - Port Android features
2. **Phase 7** - AI Coach (all platforms)
3. **Phase 8** - Social/crew features

---

## Success Metrics

### Android Launch Goals (30 Days)
- 500 downloads
- 250 active users (50% activation)
- 15 paying customers (6% conversion)
- $120 MRR
- 4.0+ Play Store rating

### 90-Day Goals
- 2,000 downloads
- 1,000 active users
- 50 paying customers
- $500 MRR

---

## Budget (All Three Platforms)

### One-Time
- Apple Developer: $99/year (when iOS starts)
- Google Play: $25 one-time
- **Total**: $124

### Monthly (MVP - Android Only)
- AWS: $150-250
- Domain: $1
- **Total**: ~$200/month

### Monthly (All Platforms + AI)
- AWS: $300-500
- AI (Bedrock): $100-300
- Marketing: $500
- **Total**: ~$1,000-1,300/month

---

## Next Steps - Android Development

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

### Initial Android Files

**build.gradle.kts (app level)**:
```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.dagger.hilt.android")
    id("kotlin-kapt")
}

android {
    namespace = "com.cannashieldct.spotbuddy"
    compileSdk = 34
    
    defaultConfig {
        applicationId = "com.cannashieldct.spotbuddy"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }
    
    buildFeatures {
        compose = true
    }
    
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.3"
    }
}

dependencies {
    // Compose
    implementation("androidx.compose.ui:ui:1.5.4")
    implementation("androidx.compose.material3:material3:1.1.2")
    implementation("androidx.compose.ui:ui-tooling-preview:1.5.4")
    implementation("androidx.activity:activity-compose:1.8.1")
    
    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.5")
    
    // Hilt
    implementation("com.google.dagger:hilt-android:2.48")
    kapt("com.google.dagger:hilt-compiler:2.48")
    
    // Retrofit
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    
    // Room
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // Google Play Billing
    implementation("com.android.billingclient:billing-ktx:6.1.0")
    
    // AWS SDK (optional, for direct AWS calls)
    implementation("aws.sdk.kotlin:textract:1.0.0")
}
```

### First Task: Create Share Extension

Start with the ShareActivity implementation and test Instagram sharing workflow.

---

**Document Version**: 3.0  
**Status**: Ready for Android Development  
**Priority**: Android First  
**Owner**: Alex (Cyber Incident Response Analyst)
