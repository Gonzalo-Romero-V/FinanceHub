package cc.financehub.app;

import android.webkit.PermissionRequest;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

// Registrar movimientos por voz usa getUserMedia/MediaRecorder (mismo código
// que en web, ver voice-recorder-button.tsx) — el WebView de Android necesita
// que se le conceda explícitamente el permiso de micrófono a nivel WebView
// además del permiso de Android declarado en el manifest (RECORD_AUDIO).
// Se extiende BridgeWebChromeClient (no un WebChromeClient plano) para no
// perder el resto del comportamiento que Capacitor ya maneja ahí (selector
// de archivos nativo, etc.).
public class MainActivity extends BridgeActivity {
    @Override
    public void onStart() {
        super.onStart();
        this.bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                request.grant(request.getResources());
            }
        });
    }
}
