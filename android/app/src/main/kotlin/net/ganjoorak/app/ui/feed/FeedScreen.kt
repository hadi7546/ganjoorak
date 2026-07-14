package net.ganjoorak.app.ui.feed

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.flow.distinctUntilChanged
import net.ganjoorak.app.audio.PoemAudioPlayer
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.ui.common.ErrorScreen
import net.ganjoorak.app.ui.common.LoadingScreen
import net.ganjoorak.app.ui.common.LocalAudioBarVisible
import net.ganjoorak.app.ui.feed.dialog.FeedPoetDialog
import net.ganjoorak.app.ui.poem.PoemViewerScreen
import net.ganjoorak.app.util.poemPoetKey

@Composable
fun FeedScreen(
    viewModel: FeedViewModel,
    poemRepository: PoemRepository,
    settings: AppSettings,
    audioPlayer: PoemAudioPlayer,
    onNavigateToPoet: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val audioBarVisible = LocalAudioBarVisible.current

    if (state.isLoading && state.poems.isEmpty()) {
        LoadingScreen(modifier)
        return
    }

    if (state.error != null && state.poems.isEmpty()) {
        ErrorScreen(message = state.error!!, onRetry = viewModel::refreshFeed, modifier = modifier)
        return
    }

    if (state.showFeedPoetDialog) {
        FeedPoetDialog(
            poets = state.availablePoets,
            selectedKeys = viewModel.effectiveFollowedKeys(),
            onSave = viewModel::saveFollowedPoets,
            onDismiss = { viewModel.setShowFeedDialog(false) },
        )
    }

    val poems = state.poems
    if (poems.isEmpty()) return

    val feedSessionKey = poems.first().id

    key(feedSessionKey) {
        val safeIndex = state.currentIndex.coerceIn(0, poems.lastIndex)
        val pagerState = rememberPagerState(
            initialPage = safeIndex,
            pageCount = { poems.size },
        )

        LaunchedEffect(safeIndex) {
            if (pagerState.currentPage != safeIndex && safeIndex in poems.indices) {
                runCatching { pagerState.scrollToPage(safeIndex) }
            }
        }

        LaunchedEffect(pagerState, poems.size) {
            snapshotFlow { pagerState.settledPage }
                .distinctUntilChanged()
                .collect { page ->
                    if (page in poems.indices) {
                        viewModel.setCurrentIndex(page)
                        if (page >= poems.lastIndex - 1) {
                            viewModel.maybePrefetch()
                        }
                    }
                }
        }

        if (poems.size == 1) {
            PoemViewerScreen(
                poem = poems[0],
                settings = settings,
                isFirst = true,
                isLast = true,
                isPreparingNext = state.isFetchingMore,
                poemRepository = poemRepository,
                audioPlayer = audioPlayer,
                onNext = viewModel::goNext,
                onPrevious = viewModel::goPrevious,
                onNavigateToPoet = { onNavigateToPoet(poemPoetKey(poems[0])) },
                isActivePage = true,
                nextPoemTitle = null,
                onAudioBarVisibilityChanged = { audioBarVisible.value = it },
                modifier = modifier.fillMaxSize(),
            )
        } else {
            VerticalPager(
                state = pagerState,
                modifier = modifier.fillMaxSize(),
                beyondViewportPageCount = 1,
                userScrollEnabled = !settings.zenScrollLock,
            ) { page ->
                val poem = poems[page]
                val nextTitle = poems.getOrNull(page + 1)?.title
                PoemViewerScreen(
                    poem = poem,
                    settings = settings,
                    isFirst = page == 0,
                    isLast = page >= poems.lastIndex,
                    isPreparingNext = state.isFetchingMore && page >= poems.lastIndex,
                    poemRepository = poemRepository,
                    audioPlayer = audioPlayer,
                    onNext = viewModel::goNext,
                    onPrevious = viewModel::goPrevious,
                    onNavigateToPoet = { onNavigateToPoet(poemPoetKey(poem)) },
                    isActivePage = page == pagerState.settledPage,
                    nextPoemTitle = nextTitle,
                    onAudioBarVisibilityChanged = { visible ->
                        if (page == pagerState.settledPage) {
                            audioBarVisible.value = visible
                        }
                    },
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
    }
}
