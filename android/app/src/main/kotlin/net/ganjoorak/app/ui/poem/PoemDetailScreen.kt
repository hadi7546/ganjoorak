package net.ganjoorak.app.ui.poem

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import net.ganjoorak.app.audio.PoemAudioPlayer
import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.ui.common.ErrorScreen
import net.ganjoorak.app.ui.common.LoadingScreen
import net.ganjoorak.app.ui.common.LocalAudioBarVisible
import net.ganjoorak.app.util.poemPoetKey

@Composable
fun PoemDetailScreen(
    poemId: Int,
    settings: AppSettings,
    poemRepository: PoemRepository,
    audioPlayer: PoemAudioPlayer,
    onBack: () -> Unit,
    onNavigateToPoet: (String) -> Unit,
) {
    var poem by remember { mutableStateOf<Poem?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadToken by remember { mutableIntStateOf(0) }
    val audioBarVisible = LocalAudioBarVisible.current

    LaunchedEffect(poemId, reloadToken) {
        error = null
        poem = null
        runCatching {
            poem = poemRepository.getPoemById(poemId)
        }.onFailure {
            error = it.message ?: "خطا در بارگیری شعر"
        }
    }

    when {
        error != null -> ErrorScreen(
            message = error!!,
            onRetry = { reloadToken++ },
        )
        poem == null -> LoadingScreen()
        else -> PoemViewerScreen(
            poem = poem!!,
            settings = settings,
            isFirst = true,
            isLast = true,
            isPreparingNext = false,
            poemRepository = poemRepository,
            audioPlayer = audioPlayer,
            onNext = {},
            onPrevious = {},
            onNavigateToPoet = { onNavigateToPoet(poemPoetKey(poem!!)) },
            onAudioBarVisibilityChanged = { audioBarVisible.value = it },
            modifier = Modifier.fillMaxSize(),
        )
    }
}
