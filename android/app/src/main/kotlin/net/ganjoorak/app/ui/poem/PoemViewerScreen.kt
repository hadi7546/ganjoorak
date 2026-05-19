package net.ganjoorak.app.ui.poem

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import net.ganjoorak.app.audio.PoemAudioPlayer
import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors
import net.ganjoorak.app.ui.theme.poemTitleStyle

private val FloatingGap = 12.dp
private val FloatingSize = 40.dp
private fun poemSourceUrl(poem: Poem): String {
    if (poem.isCustom && poem.fullUrl.startsWith("http")) return poem.fullUrl
    if (poem.isCustom) return poem.fullUrl
    return "https://offline.ganjoor.net${poem.fullUrl}"
}

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
    onOpenSearch: () -> Unit,
    onToggleZenLock: () -> Unit,
    onNavigateToPoets: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalGanjoorakColors.current
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    val linePositions = remember { mutableStateMapOf<Int, Float>() }
    var showShareSheet by remember { mutableStateOf(false) }
    var recitationIndex by remember(poem.id) { mutableIntStateOf(0) }
    var lastAutoScrollVerse by remember(poem.id) { mutableIntStateOf(-1) }
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

    LaunchedEffect(highlightedVerse, isPlaying) {
        if (!isPlaying || highlightedVerse <= 0) return@LaunchedEffect
        if (highlightedVerse == lastAutoScrollVerse) return@LaunchedEffect
        val lineY = linePositions[highlightedVerse] ?: return@LaunchedEffect
        val target = (lineY - 180f).coerceAtLeast(0f)
        val delta = target - scrollState.value
        if (kotlin.math.abs(delta) > 8f) {
            scrollState.scrollBy(delta)
        }
        lastAutoScrollVerse = highlightedVerse
    }

    LaunchedEffect(poem.id) {
        lastAutoScrollVerse = -1
        linePositions.clear()
    }

    val visibility = settings.poemViewerVisibility
    val fullTitleParts = poem.fullTitle.split(" » ").filter { it.isNotBlank() }
    val intermediateParts = if (fullTitleParts.size > 2) {
        fullTitleParts.drop(1).dropLast(1)
    } else {
        emptyList()
    }
    val poetLine = buildString {
        append(poem.poet.ifBlank { poem.poetNickname })
        if (visibility.titleBreadcrumbs && intermediateParts.isNotEmpty() && fullTitleParts.size == 2) {
            append("، ")
            append(fullTitleParts[1])
        } else if (visibility.titleBreadcrumbs && intermediateParts.isNotEmpty()) {
            append("، ")
            append(intermediateParts.joinToString("، "))
        }
    }

    val audioBottomPad = if (visibility.audioPlayer && recitation != null) 132.dp else 0.dp
    val contentBottomPad = audioBottomPad + 24.dp

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            if (visibility.titleSection) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    colors.background,
                                    colors.background.copy(alpha = 0.85f),
                                    colors.background.copy(alpha = 0f),
                                ),
                            ),
                        )
                        .padding(horizontal = 20.dp, vertical = 20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = poem.title,
                        style = poemTitleStyle(),
                        color = colors.foreground.copy(alpha = 0.95f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    if (poetLine.isNotBlank()) {
                        Spacer(Modifier.height(12.dp))
                        Text(
                            text = poetLine,
                            style = MaterialTheme.typography.bodyLarge,
                            color = colors.muted,
                            textAlign = TextAlign.Center,
                            lineHeight = MaterialTheme.typography.bodyLarge.lineHeight * 1.4f,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 8.dp),
                        )
                    }
                }
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(scrollState)
                    .padding(horizontal = 16.dp)
                    .padding(bottom = contentBottomPad)
                    .pointerInput(poem.id, isFirst, isLast) {
                        detectTapGestures { }
                    },
            ) {
                PoemTextContent(
                    plainText = poem.plainText,
                    showLineNumbers = settings.showLineNumbers,
                    highlightedVerseOrder = if (isPlaying && recitation?.inSyncWithText == true) {
                        highlightedVerse
                    } else {
                        -1
                    },
                    onLinePositioned = { lineOrder, y ->
                        linePositions[lineOrder] = y
                    },
                )
            }
        }

        val floatingBottom = contentBottomPad - 8.dp

        if (visibility.actionButtons) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .navigationBarsPadding()
                    .padding(start = 16.dp, bottom = floatingBottom),
                verticalArrangement = Arrangement.spacedBy(FloatingGap),
            ) {
                FloatingCircleButton(
                    icon = Icons.Default.Share,
                    contentDescription = "اشتراک",
                    onClick = { showShareSheet = true },
                )
                FloatingCircleButton(
                    icon = Icons.AutoMirrored.Filled.OpenInNew,
                    contentDescription = "مشاهده منبع",
                    onClick = {
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse(poemSourceUrl(poem))),
                        )
                    },
                )
                if (poem.poet.isNotBlank()) {
                    PoetProfileCard(
                        poetName = poem.poetNickname.ifBlank { poem.poet },
                        imageUrl = poem.poetImageUrl,
                        onClick = onNavigateToPoets,
                    )
                }
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .navigationBarsPadding()
                .padding(end = 16.dp, bottom = floatingBottom),
            verticalArrangement = Arrangement.spacedBy(FloatingGap),
        ) {
            FloatingCircleButton(
                icon = if (settings.zenScrollLock) Icons.Default.Lock else Icons.Default.LockOpen,
                contentDescription = "قفل ورق‌زدن",
                onClick = onToggleZenLock,
                active = settings.zenScrollLock,
            )
            FloatingCircleButton(
                icon = Icons.Default.Search,
                contentDescription = "جستجو",
                onClick = onOpenSearch,
            )
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
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding(),
            )
        }

        if (showShareSheet) {
            SharePoemSheet(
                poem = poem,
                settings = settings,
                onDismiss = { showShareSheet = false },
            )
        }

        if (isPreparingNext && isLast) {
            CircularProgressIndicator(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 72.dp, bottom = floatingBottom + 8.dp)
                    .size(28.dp),
                color = colors.foreground,
            )
        }
    }
}
