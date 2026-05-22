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
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.flow.distinctUntilChanged
import net.ganjoorak.app.audio.PoemAudioPlayer
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.ui.common.ErrorScreen
import net.ganjoorak.app.ui.common.LoadingScreen
import net.ganjoorak.app.ui.poem.PoemViewerScreen
import net.ganjoorak.app.util.poemPoetKey

@Composable
fun PoetFeedScreen(
    poetKey: String,
    poemRepository: PoemRepository,
    settings: AppSettings,
    audioPlayer: PoemAudioPlayer,
    onNavigateToSamePoet: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: PoetFeedViewModel = viewModel(
        factory = PoetFeedViewModel.Factory(poemRepository, poetKey),
        key = poetKey,
    ),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    if (state.isLoading && state.poems.isEmpty()) {
        LoadingScreen(modifier)
        return
    }

    if (state.error != null && state.poems.isEmpty()) {
        ErrorScreen(message = state.error!!, onRetry = viewModel::refreshFeed, modifier = modifier)
        return
    }

    val poems = state.poems
    if (poems.isEmpty()) return

    val feedSessionKey = "$poetKey-${poems.first().id}"

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

        val navigateToPoet: (net.ganjoorak.app.data.model.Poem) -> Unit = { poem ->
            onNavigateToSamePoet(poemPoetKey(poem))
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
                onNavigateToPoet = { navigateToPoet(poems[0]) },
                isActivePage = true,
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
                    onNavigateToPoet = { navigateToPoet(poem) },
                    isActivePage = page == pagerState.settledPage,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
    }
}
