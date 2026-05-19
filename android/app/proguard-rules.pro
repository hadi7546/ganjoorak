-keepattributes *Annotation*
-keepclassmembers class kotlinx.serialization.json.** { *; }
-keep,includedescriptorclasses class net.ganjoorak.app.**$$serializer { *; }
-keepclassmembers class net.ganjoorak.app.** {
    *** Companion;
}
-keepclasseswithmembers class net.ganjoorak.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-dontwarn okhttp3.**
-dontwarn retrofit2.**
