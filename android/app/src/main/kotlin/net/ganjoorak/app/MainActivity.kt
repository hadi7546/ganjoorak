package net.ganjoorak.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import net.ganjoorak.app.audio.PoemAudioPlayer
import net.ganjoorak.app.ui.navigation.GanjoorakNavHost
import net.ganjoorak.app.ui.theme.GanjoorakTheme

class MainActivity : ComponentActivity() {
  private var audioPlayer: PoemAudioPlayer? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    WindowCompat.getInsetsController(window, window.decorView).apply {
      isAppearanceLightStatusBars = false
    }

    val container = (application as GanjoorakApplication).container
    audioPlayer = PoemAudioPlayer(this)

    setContent {
      val settings by container.settingsRepository.settings.collectAsStateWithLifecycle(
        initialValue = net.ganjoorak.app.domain.settings.AppSettings(),
      )
      val player = remember { audioPlayer!! }

      GanjoorakTheme(
        theme = settings.theme,
        fontFamily = settings.fontFamily,
        poemFontSize = settings.poemFontSize,
      ) {
        GanjoorakNavHost(
          container = container,
          audioPlayer = player,
        )
      }
    }
  }

  override fun onDestroy() {
    audioPlayer?.release()
    audioPlayer = null
    super.onDestroy()
  }
}
