package cc.financehub.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

// Registrar movimientos por voz usa getUserMedia/MediaRecorder (mismo código
// que en web, ver voice-recorder-button.tsx). El WebView necesita que se le
// conceda el permiso a nivel WebView (onPermissionRequest) — pero eso solo
// sirve de algo si Android ya le dio el permiso RECORD_AUDIO a la app a
// nivel de sistema operativo: es un permiso "peligroso", que desde Android 6
// requiere el diálogo nativo en tiempo de ejecución, no alcanza con
// declararlo en el manifest. Antes esto nunca se pedía, por eso la
// grabación fallaba directo sin mostrar ningún diálogo. Ahora: si falta, se
// pide, y el permiso del WebView queda pendiente hasta que el usuario
// responde el diálogo del sistema.
public class MainActivity extends BridgeActivity {
    private static final int RECORD_AUDIO_REQUEST_CODE = 6001;
    private PermissionRequest pendingWebViewRequest;

    @Override
    public void onStart() {
        super.onStart();
        this.bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (
                    ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                        == PackageManager.PERMISSION_GRANTED
                ) {
                    request.grant(request.getResources());
                    return;
                }

                pendingWebViewRequest = request;
                ActivityCompat.requestPermissions(
                    MainActivity.this,
                    new String[] { Manifest.permission.RECORD_AUDIO },
                    RECORD_AUDIO_REQUEST_CODE
                );
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == RECORD_AUDIO_REQUEST_CODE && pendingWebViewRequest != null) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (granted) {
                pendingWebViewRequest.grant(pendingWebViewRequest.getResources());
            } else {
                pendingWebViewRequest.deny();
            }
            pendingWebViewRequest = null;
        }
    }
}
