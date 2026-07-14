package net.ganjoorak.app.ui.poem

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.gestures.animateScrollBy
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
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
import net.ganjoorak.app.util.poemPoetKey

private val PoemMaxWidth = 560.dp
private val TitleHideScrollThreshold = 56
private val SideFloatingPadding = 16.dp

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
    onNavigateToPoet: (String) -> Unit,
    isActivePage: Boolean = true,
    nextPoemTitle: String? = null,
    onAudioBarVisibilityChanged: ((Boolean) -> Unit)? = null,
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

    val hideTitleOnScroll by remember {
        derivedStateOf { scrollState.value > TitleHideScrollThreshold }
    }

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

    DisposableEffect(isActivePage, hasAudio, shareMode) {
        if (isActivePage) {
            onAudioBarVisibilityChanged?.invoke(hasAudio && !shareMode)
        }
        onDispose {
            if (isActivePage) {
                onAudioBarVisibilityChanged?.invoke(false)
            }
        }
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

    val bottomClearance = when {
        shareMode -> 120.dp
        hasAudio -> 140.dp
        else -> 96.dp
    }
    val showChrome = !shareMode && !settings.zenScrollLock

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 20.dp)
                .padding(top = if (visibility.titleSection) 120.dp else 24.dp)
                .padding(bottom = bottomClearance),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(
                modifier = Modifier
                    .widthIn(max = PoemMaxWidth)
                    .fillMaxWidth(),
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
            }
        }

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
        } else {
            AnimatedVisibility(
                visible = visibility.titleSection && !hideTitleOnScroll,
                enter = fadeIn() + slideInVertically(),
                exit = fadeOut() + slideOutVertically(),
                modifier = Modifier.align(Alignment.TopCenter),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    colors.background.copy(alpha = 0.92f),
                                    colors.background.copy(alpha = 0.72f),
                                    colors.background.copy(alpha = 0f),
                                ),
                            ),
                        )
                        .padding(horizontal = 24.dp, vertical = 20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = poem.title,
                        style = poemTitleStyle().copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Medium),
                        color = colors.foreground.copy(alpha = 0.95f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Box(
                        modifier = Modifier
                            .padding(top = 10.dp)
                            .width(80.dp)
                            .height(1.dp)
                            .background(
                                Brush.horizontalGradient(
                                    listOf(
                                        colors.foreground.copy(alpha = 0f),
                                        colors.foreground.copy(alpha = 0.3f),
                                        colors.foreground.copy(alpha = 0f),
                                    ),
                                ),
                            ),
                    )
                    if (poetLine.isNotBlank()) {
                        Spacer(Modifier.height(10.dp))
                        Text(
                            text = poetLine,
                            style = MaterialTheme.typography.bodyLarge.copy(
                                lineHeight = (MaterialTheme.typography.bodyLarge.fontSize.value * 1.55f).sp,
                            ),
                            color = colors.foreground.copy(alpha = 0.72f),
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 8.dp),
                        )
                    }
                }
            }
        }

        if (visibility.actionButtons && showChrome) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .navigationBarsPadding()
                    .padding(
                        start = SideFloatingPadding,
                        bottom = if (hasAudio) 88.dp else 20.dp,
                    ),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                FloatingCircleButton(
                    icon = Icons.Default.Share,
                    contentDescription = "اشتراک",
                    onClick = { enterShareMode() },
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
                        onClick = { onNavigateToPoet(poemPoetKey(poem)) },
                        compact = true,
                    )
                }
            }
        }

        if (!shareMode && !settings.zenScrollLock && !nextPoemTitle.isNullOrBlank()) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(bottom = if (hasAudio) 76.dp else 16.dp)
                    .widthIn(max = 240.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(colors.background.copy(alpha = 0.64f))
                    .padding(horizontal = 12.dp, vertical = 7.dp),
            ) {
                Text(
                    text = "بعدی: $nextPoemTitle",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.foreground.copy(alpha = 0.78f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        if (shareMode) {
            ShareSelectionBar(
                poem = poem,
                settings = settings,
                selectedLineIndices = selectedLineIndices,
                allLines = allShareLines,
                onDismiss = { exitShareMode() },
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        } else if (hasAudio) {
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
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        }

        if (isPreparingNext && isLast) {
            CircularProgressIndicator(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .navigationBarsPadding()
                    .padding(end = 20.dp, bottom = if (hasAudio) 96.dp else 88.dp)
                    .size(22.dp),
                color = colors.foreground,
                strokeWidth = 2.dp,
            )
        }
    }
}
