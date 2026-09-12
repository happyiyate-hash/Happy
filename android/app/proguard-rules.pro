# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Capacitor Plugin & Bridge Preservation
-keep public class * extends com.getcapacitor.Plugin
-keep public class * extends com.getcapacitor.BridgeActivity
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class * implements com.getcapacitor.Plugin
-dontwarn com.getcapacitor.**

# WebView JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve Capacitor community / Cordova plugins if present
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# Suppress warnings from common libraries
-dontwarn java.lang.invoke.**
-dontwarn javax.annotation.**

