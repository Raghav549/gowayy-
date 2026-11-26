package in.gowayy.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

/**
 * The gowayy Android app: the live gowayy website (R.string.app_url) in a
 * full-screen WebView. All screens, data and accounts come from the website,
 * so the app is always exactly the web app and needs no separate backend.
 */
public class MainActivity extends Activity {

    private static final int FILE_REQUEST = 41;

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String appUrl;
    private String appHost;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        appUrl = getString(R.string.app_url);
        appHost = getString(R.string.app_host);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.bars));
        web = new WebView(this);
        web.setBackgroundColor(getColor(R.color.surface));
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // Android 15+ draws apps edge to edge: keep the site clear of the status
        // bar, navigation bar, camera cutout and the on-screen keyboard.
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((View v, WindowInsets insets) -> {
                Insets b = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(b.left, b.top, b.right, b.bottom);
                return WindowInsets.CONSUMED;
            });
        }

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadsImagesAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setSupportMultipleWindows(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        // The layout is designed for the browser's 100% text size.
        s.setTextZoom(100);
        s.setUserAgentString(s.getUserAgentString() + " gowayyApp/Android");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        web.setDownloadListener((url, ua, disposition, mime, length) -> openExternal(Uri.parse(url)));

        if (savedInstanceState != null && web.restoreState(savedInstanceState) != null) return;
        Uri link = linkFrom(getIntent());
        web.loadUrl(link != null ? link.toString() : appUrl);
    }

    /** A gowayy link the app was opened with, if any. */
    private Uri linkFrom(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) return null;
        Uri data = intent.getData();
        return data != null && isAppHost(data.getHost()) ? data : null;
    }

    private boolean isAppHost(String host) {
        return host != null && (host.equalsIgnoreCase(appHost) || host.toLowerCase().endsWith("." + appHost.toLowerCase()));
    }

    /** Phone numbers, mail, maps, UPI apps and other websites open in their own apps. */
    private void openExternal(Uri uri) {
        try {
            Intent intent;
            if ("intent".equals(uri.getScheme())) {
                intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setComponent(null);
                intent.setSelector(null);
                try {
                    startActivity(intent);
                } catch (ActivityNotFoundException e) {
                    String fallback = intent.getStringExtra("browser_fallback_url");
                    if (fallback != null) startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(fallback)));
                }
                return;
            }
            intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "No app found to open this link", Toast.LENGTH_SHORT).show();
        }
    }

    private final class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String scheme = uri.getScheme();
            if (("https".equals(scheme) || "http".equals(scheme)) && isAppHost(uri.getHost())) return false;
            openExternal(uri);
            return true;
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) showOffline(request.getUrl().toString());
        }
    }

    private final class Chrome extends WebChromeClient {
        /** Lets the profile-photo picker and other file inputs open the gallery / files. */
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            try {
                startActivityForResult(Intent.createChooser(params.createIntent(), null), FILE_REQUEST);
                return true;
            } catch (ActivityNotFoundException e) {
                fileCallback = null;
                return false;
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_REQUEST) {
            if (fileCallback != null) fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    /** Shown instead of the browser's error page when there is no connection. */
    private void showOffline(String failedUrl) {
        String target = failedUrl != null && failedUrl.startsWith("http") ? failedUrl : appUrl;
        String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f2ff;"
                + "font-family:system-ui,sans-serif;color:#17151f;text-align:center;padding:24px;box-sizing:border-box}"
                + "b{font-size:30px;letter-spacing:-.05em}b i{font-style:normal;color:#7c3aed}"
                + "p{color:rgba(23,21,31,.6);font-size:15px;line-height:1.5;margin:10px 0 22px}"
                + "button{border:0;border-radius:999px;background:#7c3aed;color:#fff;font-weight:700;font-size:15px;"
                + "min-height:48px;padding:0 26px}</style></head><body><div><b>gowa<i>yy</i></b>"
                + "<h2 style='margin:18px 0 0;font-size:19px'>You're offline</h2>"
                + "<p>Check your internet connection and try again.</p>"
                + "<button onclick='location.replace(" + jsString(target) + ")'>Try again</button></div></body></html>";
        web.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);
    }

    private static String jsString(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("<", "\\u003c") + "\"";
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri link = linkFrom(intent);
        if (link != null) web.loadUrl(link.toString());
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        web.onPause();
        CookieManager.getInstance().flush(); // stay signed in after the app is closed
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
