package net.ganjoorak.app.ui.poem

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import net.ganjoorak.app.audio.PoemAudioPlayer
import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.ui.common.ErrorScreen
import net.ganjoorak.app.ui.common.LoadingScreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PoemDetailScreen(
    poemId: Int,
    settings: AppSettings,
    poemRepository: PoemRepository,
    audioPlayer: PoemAudioPlayer,
    onBack: () -> Unit,
) {
    var poem by remember { mutableStateOf<Poem?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadToken by remember { mutableIntStateOf(0) }

    LaunchedEffect(poemId, reloadToken) {
        error = null
        poem = null
        runCatching {
            poem = poemRepository.getPoemById(poemId)
        }.onFailure {
            error = it.message ?: "خطا در بارگیری شعر"
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "بازگشت")
                    }
                },
            )
        },
    ) { _ ->
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
                onOpenMenu = {},
                onOpenSearch = {},
                onOpenSettings = {},
            )
        }
    }
}
