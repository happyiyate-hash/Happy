package io.tokencare.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Native Android edge-to-edge shell for TokenCare.
 * Android owns the system bars, while the WebView paints one continuous
 * surface underneath them. The web UI only applies content-safe padding.
 */
public class EdgeToEdgeActivity extends BridgeActivity {
    private static final int APP_SURFACE_COLOR = Color.rgb(6, 8, 14); // #06080E

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        // Keep the Activity's native surface dark while the WebView is being
        // created/recreated. This prevents Android's default gray surface
        // from flashing when the OS has reclaimed the app process.
        window.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(APP_SURFACE_COLOR));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(false);
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarDividerColor(Color.TRANSPARENT);
        }

        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }

        View webView = getBridge().getWebView();
        if (webView == null) return;

        // Never expose a default WebView/Android gray while the HTML/React
        // surface is starting up.
        webView.setBackgroundColor(APP_SURFACE_COLOR);
        webView.setOnApplyWindowInsetsListener((view, insets) -> {
            int topPx = 0;
            int bottomPx = 0;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                topPx = insets.getInsets(WindowInsets.Type.statusBars()).top;
                bottomPx = insets.getInsets(WindowInsets.Type.navigationBars()).bottom;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    bottomPx = Math.max(
                            bottomPx,
                            insets.getInsets(WindowInsets.Type.mandatorySystemGestures()).bottom
                    );
                }
            } else {
                topPx = insets.getSystemWindowInsetTop();
                bottomPx = insets.getSystemWindowInsetBottom();
            }

            final float density = view.getResources().getDisplayMetrics().density > 0
                    ? view.getResources().getDisplayMetrics().density
                    : 1f;
            final float safeTopCss = topPx / density;
            final float safeBottomCss = bottomPx / density;

            if (view instanceof WebView) {
                ((WebView) view).post(() -> ((WebView) view).evaluateJavascript(
                        "document.documentElement.style.setProperty('--native-safe-top','" + safeTopCss + "px');" +
                        "document.documentElement.style.setProperty('--native-safe-bottom','" + safeBottomCss + "px');",
                        null
                ));
            }

            return insets;
        });

        webView.requestApplyInsets();
    }
}
