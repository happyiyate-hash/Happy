package io.tokencare.app;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 15 uses edge-to-edge by default. Apply the real system-bar
        // insets once at the native WebView boundary so the entire Capacitor
        // app gets one consistent viewport. Individual React pages must not
        // reserve their own status-bar height.
        View webView = getBridge().getWebView();
        if (webView != null) {
            webView.setOnApplyWindowInsetsListener((view, insets) -> {
                int top;
                int bottom;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    top = insets.getInsets(WindowInsets.Type.statusBars()).top;
                    bottom = insets.getInsets(WindowInsets.Type.navigationBars()).bottom;
                } else {
                    top = insets.getSystemWindowInsetTop();
                    bottom = insets.getSystemWindowInsetBottom();
                }

                view.setPadding(0, top, 0, bottom);
                return insets;
            });
            webView.requestApplyInsets();
        }
    }
}
