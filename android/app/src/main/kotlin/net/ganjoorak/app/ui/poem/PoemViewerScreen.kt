package net.ganjoorak.app.ui.poem

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.gestures.animateScrollBy
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import net.ganjoorak.app.audio.PoemAudioPlayer
import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.share.shareableLinesFrom
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors
import net.ganjoorak.app.ui.theme.poemTitleStyle

private val SideRailWidth = 64.dp
private val SideButtonGap = 8.dp
private val PoemMaxWidth = 520.dp

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
    isActivePage: Boolean = true,
    modifier: Modifier = Modifier,
) {
    val colors = LocalGanjoorakColors.current
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    val linePositions = remember { mutableStateMapOf<Int, Float>() }
    var shareMode by remember { mutableStateOf(false) }
    val allShareLines = remember(poem.id) { shareableLinesFrom(poem) }
    var selectedLineIndices by remember(poem.id) {
        mutableStateOf(allShareLines.indices.take(minOf(4, allShareLines.size)).toSet())
    }
    var recitationIndex by remember(poem.id) { mutableIntStateOf(0) }
    var lastAutoScrollVerse by remember(poem.id) { mutableIntStateOf(-1) }
    val recitation = poem.recitations.getOrNull(recitationIndex)
    val hasAudio = settings.poemViewerVisibility.audioPlayer &&
        recitation != null &&
        recitation.mp3Url.isNotBlank()

    val isPlaying by audioPlayer.isPlaying.collectAsStateWithLifecycle()
    val isAudioLoading by audioPlayer.isLoading.collectAsStateWithLifecycle()
    val currentTime by audioPlayer.currentTimeSec.collectAsStateWithLifecycle()
    val duration by audioPlayer.durationSec.collectAsStateWithLifecycle()
    val highlightedVerse by audioPlayer.highlightedVerse.collectAsStateWithLifecycle()

    fun enterShareMode() {
        audioPlayer.pause()
        selectedLineIndices = allShareLines.indices.take(minOf(4, allShareLines.size)).toSet()
        shareMode = true
    }

    fun exitShareMode() {
        shareMode = false
    }

    LaunchedEffect(poem.id) {
        audioPlayer.pause()
        recitationIndex = 0
        shareMode = false
        selectedLineIndices = allShareLines.indices.take(minOf(4, allShareLines.size)).toSet()
    }

    BackHandler(enabled = shareMode) { exitShareMode() }

    LaunchedEffect(recitation?.id) {
        if (recitation?.inSyncWithText == true) {
            runCatching {
                audioPlayer.setVerseSync(poemRepository.getRecitationVerses(recitation.id))
            }
        } else {
            audioPlayer.setVerseSync(emptyList())
        }
    }

    LaunchedEffect(isActivePage) {
        if (!isActivePage) return@LaunchedEffect
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
            runCatching { scrollState.animateScrollBy(delta) }
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

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        if (shareMode) {
            ShareModeHeader(
                poemTitle = poem.title,
                selectedCount = selectedLineIndices.size,
                totalLines = allShareLines.size,
                onClose = { exitShareMode() },
                onToggleSelectAll = {
                    selectedLineIndices = if (selectedLineIndices.size == allShareLines.size) {
                        emptySet()
                    } else {
                        allShareLines.indices.toSet()
                    }
                },
                allSelected = allShareLines.isNotEmpty() &&
                    selectedLineIndices.size == allShareLines.size,
            )
        } else if (visibility.titleSection) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                colors.background,
                                colors.background.copy(alpha = 0.88f),
                                colors.background.copy(alpha = 0f),
                            ),
                        ),
                    )
                    .padding(horizontal = 20.dp, vertical = 16.dp),
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
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = poetLine,
                        style = MaterialTheme.typography.bodyLarge.copy(
                            lineHeight = (MaterialTheme.typography.bodyLarge.fontSize.value * 1.55f).sp,
                        ),
                        color = colors.muted,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp),
                    )
                }
            }
        }

        Row(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
        ) {
            if (visibility.actionButtons) {
                Column(
                    modifier = Modifier
                        .width(SideRailWidth)
                        .fillMaxHeight()
                        .padding(vertical = 10.dp, horizontal = 4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    FloatingCircleButton(
                        icon = Icons.Default.Share,
                        contentDescription = "اشتراک",
                        onClick = { if (shareMode) exitShareMode() else enterShareMode() },
                        active = shareMode,
                    )
                    Spacer(Modifier.height(SideButtonGap))
                    FloatingCircleButton(
                        icon = Icons.AutoMirrored.Filled.OpenInNew,
                        contentDescription = "مشاهده منبع",
                        onClick = {
                            context.startActivity(
                                Intent(Intent.ACTION_VIEW, Uri.parse(poemSourceUrl(poem))),
                            )
                        },
                    )
                    Spacer(Modifier.weight(1f))
                    if (!shareMode && poem.poet.isNotBlank()) {
                        PoetProfileCard(
                            poetName = poem.poetNickname.ifBlank { poem.poet },
                            imageUrl = poem.poetImageUrl,
                            onClick = onNavigateToPoets,
                            compact = true,
                        )
                    }
                }
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                contentAlignment = Alignment.TopCenter,
            ) {
                Column(
                    modifier = Modifier
                        .widthIn(max = PoemMaxWidth)
                        .fillMaxWidth()
                        .fillMaxHeight()
                        .verticalScroll(scrollState)
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                ) {
                    PoemTextContent(
                        plainText = poem.plainText,
                        showLineNumbers = settings.showLineNumbers,
                        highlightedVerseOrder = if (
                            !shareMode && isPlaying && recitation?.inSyncWithText == true
                        ) {
                            highlightedVerse
                        } else {
                            -1
                        },
                        onLinePositioned = { lineOrder, y ->
                            linePositions[lineOrder] = y
                        },
                        shareSelectMode = shareMode,
                        selectedLineIndices = selectedLineIndices,
                        onShareLineToggle = { index ->
                            selectedLineIndices = if (index in selectedLineIndices) {
                                selectedLineIndices - index
                            } else {
                                selectedLineIndices + index
                            }
                        },
                    )
                    Spacer(Modifier.height(24.dp))
                }
            }

            if (visibility.actionButtons) {
                Column(
                    modifier = Modifier
                        .width(SideRailWidth)
                        .fillMaxHeight()
                        .padding(vertical = 12.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    FloatingCircleButton(
                        icon = if (settings.zenScrollLock) Icons.Default.Lock else Icons.Default.LockOpen,
                        contentDescription = "قفل ورق‌زدن",
                        onClick = onToggleZenLock,
                        active = settings.zenScrollLock,
                    )
                    Spacer(Modifier.height(SideButtonGap))
                    FloatingCircleButton(
                        icon = Icons.Default.Search,
                        contentDescription = "جستجو",
                        onClick = onOpenSearch,
                    )
                }
            }
        }

        if (shareMode) {
            ShareSelectionBar(
                poem = poem,
                settings = settings,
                selectedLineIndices = selectedLineIndices,
                allLines = allShareLines,
                onDismiss = { exitShareMode() },
            )
        } else if (hasAudio) {
            HorizontalDivider(color = colors.border.copy(alpha = 0.35f))
            AudioPlayerBar(
                recitation = recitation,
                recitationIndex = recitationIndex,
                recitationCount = poem.recitations.size,
                isPlaying = isPlaying,
                isLoading = isAudioLoading,
                currentTimeSec = currentTime,
                durationSec = duration,
                onTogglePlay = {
                    if (isPlaying) audioPlayer.pause() else audioPlayer.play(recitation)
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
            )
        }

        if (isPreparingNext && isLast) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                contentAlignment = Alignment.CenterEnd,
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = colors.foreground,
                    strokeWidth = 2.dp,
                )
            }
        }
    }
}
