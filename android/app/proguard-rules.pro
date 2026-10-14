# ==============================================================================
# Mindra — ProGuard / R8 rules for the release build.
# Applied on top of proguard-android-optimize.txt.
# ==============================================================================

# ── Flutter engine & embedding ────────────────────────────────────────────────
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# ── flutter_local_notifications ───────────────────────────────────────────────
# The plugin (de)serializes scheduled-notification payloads via Gson reflection.
-keep class com.dexterous.** { *; }
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses,EnclosingMethod

# ── Gson (transitive dependency of flutter_local_notifications) ────────────────
-keep class com.google.gson.** { *; }
-keepclassmembers,allowobfuscation class * {
  @com.google.gson.annotations.SerializedName <fields>;
}

# ── permission_handler ────────────────────────────────────────────────────────
-keep class com.baseflow.permissionhandler.** { *; }

# ── audioplayers / just_audio (ExoPlayer-backed playback) ─────────────────────
-keep class com.google.android.exoplayer2.** { *; }
-dontwarn com.google.android.exoplayer2.**
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# ── record (audio capture) ────────────────────────────────────────────────────
-keep class com.llfbandit.record.** { *; }

# ── flutter_secure_storage ────────────────────────────────────────────────────
-keep class androidx.security.crypto.** { *; }
-dontwarn androidx.security.crypto.**

# ── printing / pdf ────────────────────────────────────────────────────────────
-keep class net.nfet.** { *; }
-dontwarn net.nfet.**

# ── url_launcher / connectivity_plus / shared_preferences ─────────────────────
# Standard method-channel plugins — defaults are sufficient; suppress warnings.
-dontwarn dev.fluttercommunity.plus.connectivity.**

# ── Supabase / OkHttp (networking stack used by supabase_flutter) ─────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# ── Kotlin coroutines / metadata ──────────────────────────────────────────────
-keepclassmembers class kotlinx.coroutines.** { volatile <fields>; }
-dontwarn kotlinx.coroutines.**
-keep class kotlin.Metadata { *; }

# ── Play Core (referenced by Flutter deferred components; unused by Mindra) ───
-dontwarn com.google.android.play.core.**

# ── Strip Android logging in release ──────────────────────────────────────────
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# ── Keep annotations & generic signatures app-wide ────────────────────────────
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
