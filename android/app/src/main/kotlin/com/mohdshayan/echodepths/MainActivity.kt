package com.mohdshayan.echodepths

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONArray

/**
 * EchoDepths shell. The game is the HTML5 core in assets/www, served from an
 * app-private https origin (so Web Audio, localStorage and pointer events behave
 * exactly as in Chrome). Native side adds amplitude-controlled haptics.
 */
class MainActivity : ComponentActivity() {
    private companion object {
        const val TAG = "EchoDepths"
        /** The game's ground: deep navy, the same as --bg in the page. */
        const val ABYSS = 0xFF050D16.toInt()
    }
    private var insetCss: String? = null
    private lateinit var web: WebView
    private val vibrator: Vibrator? by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.statusBarColor = ABYSS
        window.navigationBarColor = ABYSS

        web = WebView(this).apply {
            setBackgroundColor(ABYSS)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.setSupportZoom(false)
            settings.builtInZoomControls = false
            settings.displayZoomControls = false
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.textZoom = 100
            isHapticFeedbackEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            addJavascriptInterface(EchoNative(), "EchoNative")
        }
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = true
            override fun onPageFinished(view: WebView, url: String) {
                Log.i(TAG, "page finished: $url title=${view.title}")
                insetCss?.let { view.evaluateJavascript(it, null) }
            }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                Log.e(TAG, "load error ${error.errorCode} ${error.description} for ${request.url}")
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(m: ConsoleMessage): Boolean { Log.i(TAG, "js ${m.messageLevel()} ${m.sourceId()}:${m.lineNumber()} ${m.message()}"); return true }
        }
        setContentView(web)
        web.loadUrl("https://appassets.androidplatform.net/www/index.html")

        // Status bar and display cutout insets reach the page as --sat / --sab; position:fixed chrome pads itself with them.
        ViewCompat.setOnApplyWindowInsetsListener(web) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val d = resources.displayMetrics.density
            insetCss = "if(document.documentElement){" +
                       "document.documentElement.style.setProperty('--sat','" + (bars.top / d) + "px');" +
                       "document.documentElement.style.setProperty('--sab','" + (bars.bottom / d) + "px');}"
            web.evaluateJavascript(insetCss ?: "", null)
            insets
        }
        ViewCompat.requestApplyInsets(web)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // The page gets first refusal on Back: pause a run, close a menu, surface from the death screen.
                // Only when it returns false (the title screen) does the activity finish.
                web.evaluateJavascript(
                    "(function(){ try { return (window.App && App.back && App.back()) ? 'handled' : 'exit' } catch(e) { return 'exit' } })()"
                ) { result -> if (result == null || !result.contains("handled")) finish() }
            }
        })
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        WindowInsetsControllerCompat(window, web).let {
            it.hide(WindowInsetsCompat.Type.systemBars())
            it.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        web.evaluateJavascript("window.App && App.onResume && App.onResume()", null)
    }

    override fun onPause() {
        // Pause the run and silence the cave before the WebView stops ticking.
        web.evaluateJavascript("if (window.App && App.onPause) { App.onPause() } else if (window.Game) { Game.pause() }", null)
        web.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }

    /** Exposed to JS as window.EchoNative. Amplitude 1..255. */
    inner class EchoNative {
        @JavascriptInterface
        fun vibrate(ms: Int, amplitude: Int) {
            val v = vibrator ?: return
            if (!v.hasVibrator()) return
            val amp = if (v.hasAmplitudeControl()) amplitude.coerceIn(1, 255) else VibrationEffect.DEFAULT_AMPLITUDE
            v.vibrate(VibrationEffect.createOneShot(ms.coerceIn(1, 2000).toLong(), amp))
        }

        @JavascriptInterface
        fun vibratePattern(json: String, amplitude: Int) {
            val v = vibrator ?: return
            if (!v.hasVibrator()) return
            val arr = try { JSONArray(json) } catch (e: Exception) { return }
            // JS pattern is [on, off, on, off, ...]; VibrationEffect wants [off, on, off, on, ...]
            val timings = LongArray(arr.length() + 1)
            val amps = IntArray(arr.length() + 1)
            timings[0] = 0; amps[0] = 0
            val amp = if (v.hasAmplitudeControl()) amplitude.coerceIn(1, 255) else VibrationEffect.DEFAULT_AMPLITUDE
            for (i in 0 until arr.length()) {
                timings[i + 1] = arr.optLong(i, 0).coerceIn(0, 2000)
                amps[i + 1] = if (i % 2 == 0) amp else 0
            }
            v.vibrate(VibrationEffect.createWaveform(timings, amps, -1))
        }

        @JavascriptInterface
        fun hasAmplitudeControl(): Boolean = vibrator?.hasAmplitudeControl() == true
    }
}
