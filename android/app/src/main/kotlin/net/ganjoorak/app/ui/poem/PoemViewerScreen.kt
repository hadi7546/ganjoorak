package net.ganjoorak.app.ui.poem

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import net.ganjoorak.app.audio.PoemAudioPlayer
import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors
import net.ganjoorak.app.ui.theme.poemTitleStyle

@Composable
fun PoemViewerScreen(
    poem: Poem,
    settings: AppSettings,
    isFirst: Boolean,
    isLast: Boolean,
    isPreparingNext: Boolean,
    poemRepository: PoemRepository,
    audioPlayer: PoemAudioPlayer,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    onOpenMenu: () -> Unit,
    onOpenSearch: () -> Unit,
    onOpenSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalGanjoorakColors.current
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    var recitationIndex by remember(poem.id) { mutableIntStateOf(0) }
    val recitation = poem.recitations.getOrNull(recitationIndex)

    val isPlaying by audioPlayer.isPlaying.collectAsStateWithLifecycle()
    val isAudioLoading by audioPlayer.isLoading.collectAsStateWithLifecycle()
    val currentTime by audioPlayer.currentTimeSec.collectAsStateWithLifecycle()
    val duration by audioPlayer.durationSec.collectAsStateWithLifecycle()
    val highlightedVerse by audioPlayer.highlightedVerse.collectAsStateWithLifecycle()

    LaunchedEffect(poem.id) {
        audioPlayer.pause()
        recitationIndex = 0
    }

    LaunchedEffect(recitation?.id) {
        if (recitation?.inSyncWithText == true) {
            runCatching {
                audioPlayer.setVerseSync(poemRepository.getRecitationVerses(recitation.id))
            }
        } else {
            audioPlayer.setVerseSync(emptyList())
        }
    }

    LaunchedEffect(Unit) {
        while (isActive) {
            audioPlayer.tick()
            delay(250)
        }
    }

    val visibility = settings.poemViewerVisibility
    val titleParts = poem.fullTitle.split(" » ").filter { it.isNotBlank() }

    Box(modifier = modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 72.dp, bottom = if (visibility.audioPlayer && recitation != null) 140.dp else 24.dp),
        ) {
            if (visibility.titleSection) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    if (poem.poetImageUrl.isNotBlank()) {
                        AsyncImage(
                            model = poem.poetImageUrl,
                            contentDescription = poem.poet,
                            modifier = Modifier.size(56.dp),
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                    Text(
                        text = titleParts.lastOrNull() ?: poem.title,
                        style = poemTitleStyle(),
                        color = colors.foreground,
                        textAlign = TextAlign.Center,
                    )
                    if (visibility.titleBreadcrumbs && titleParts.size > 1) {
                        Text(
                            text = titleParts.dropLast(1).joinToString(" » "),
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.muted,
                            textAlign = TextAlign.Center,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(scrollState)
                    .padding(horizontal = 16.dp)
                    .pointerInput(poem.id, isFirst, isLast) {
                        detectTapGestures { }
                    },
            ) {
                PoemTextContent(
                    plainText = poem.plainText,
                    showLineNumbers = settings.showLineNumbers,
                    highlightedVerseOrder = if (isPlaying) highlightedVerse else -1,
                )
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onOpenMenu) {
                Icon(Icons.Default.Menu, contentDescription = "منو", tint = colors.foreground)
            }
            Spacer(Modifier.weight(1f))
            if (visibility.actionButtons) {
                IconButton(onClick = {
                    val shareText = "${poem.fullTitle}\n\n${poem.plainText}"
                    context.startActivity(
                        Intent.createChooser(
                            Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, shareText)
                            },
                            "اشتراک شعر",
                        ),
                    )
                }) {
                    Icon(Icons.Default.Share, contentDescription = "اشتراک", tint = colors.foreground)
                }
            }
            IconButton(onClick = onOpenSearch) {
                Icon(Icons.Default.Search, contentDescription = "جستجو", tint = colors.foreground)
            }
        }

        if (visibility.audioPlayer) {
            AudioPlayerBar(
                recitation = recitation,
                recitationIndex = recitationIndex,
                recitationCount = poem.recitations.size,
                isPlaying = isPlaying,
                isLoading = isAudioLoading,
                currentTimeSec = currentTime,
                durationSec = duration,
                onTogglePlay = {
                    if (recitation != null) {
                        if (isPlaying) audioPlayer.pause() else audioPlayer.play(recitation)
                    }
                },
                onPreviousRecitation = {
                    audioPlayer.previousRecitation(poem.recitations, recitationIndex)
                    recitationIndex = (recitationIndex - 1).coerceAtLeast(0)
                },
                onNextRecitation = {
                    audioPlayer.nextRecitation(poem.recitations, recitationIndex)
                    recitationIndex = (recitationIndex + 1).coerceAtMost(poem.recitations.lastIndex)
                },
                onSeek = audioPlayer::seekTo,
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        }

        if (isPreparingNext && isLast) {
            CircularProgressIndicator(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(24.dp)
                    .size(28.dp),
            )
        }
    }
}
