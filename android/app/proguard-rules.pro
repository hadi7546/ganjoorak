-keepattributes *Annotation*, InnerClasses, EnclosingMethod, Signature
-keepattributes SourceFile,LineNumberTable

# Kotlin serialization (API + bundled assets + settings)
-keep,includedescriptorclasses class net.ganjoorak.app.**$$serializer { *; }
-keepclassmembers class net.ganjoorak.app.** {
    *** Companion;
}
-keepclasseswithmembers class net.ganjoorak.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep @kotlinx.serialization.Serializable class net.ganjoorak.app.** { *; }
-keepclassmembers class kotlinx.serialization.json.** { *; }

# Retrofit + kotlinx-serialization converter
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response { *; }
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-keep interface net.ganjoorak.app.data.api.** { *; }

# OkHttp / Okio
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Media3 / ExoPlayer
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# Coil
-keep class coil.** { *; }
-dontwarn coil.**

# Compose (ViewModels, navigation)
-keep class * extends androidx.lifecycle.ViewModel { *; }
-keep class * extends androidx.lifecycle.ViewModelProvider$Factory { *; }

# BuildConfig
-keep class net.ganjoorak.app.BuildConfig { *; }
