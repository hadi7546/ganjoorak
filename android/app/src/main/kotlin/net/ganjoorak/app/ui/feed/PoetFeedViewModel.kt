package net.ganjoorak.app.ui.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.data.repository.PoemRepository

class PoetFeedViewModel(
    private val poemRepository: PoemRepository,
    private val poetKey: String,
) : ViewModel() {
    private val _poems = MutableStateFlow<List<Poem>>(emptyList())
    private val _currentIndex = MutableStateFlow(0)
    private val _isLoading = MutableStateFlow(true)
    private val _isFetchingMore = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)

    private val fetchMutex = Mutex()
    private var feedVersion = 0

    val uiState: StateFlow<FeedUiState> = combine(
        _poems,
        _currentIndex,
        _isLoading,
        _isFetchingMore,
        _error,
    ) { poems, index, loading, fetchingMore, error ->
        FeedUiState(
            poems = poems,
            currentIndex = index,
            isLoading = loading,
            isFetchingMore = fetchingMore,
            error = error,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), FeedUiState())

    init {
        refreshFeed()
    }

    fun setCurrentIndex(index: Int) {
        _currentIndex.value = index.coerceIn(0, (_poems.value.size - 1).coerceAtLeast(0))
        maybePrefetch()
    }

    fun refreshFeed() {
        viewModelScope.launch {
            val version = ++feedVersion
            _isLoading.value = true
            _error.value = null
            _currentIndex.value = 0
            runCatching {
                val first = poemRepository.getRandomPoemForFollowedKey(poetKey)
                if (version != feedVersion) return@launch
                _poems.value = listOf(first)
                _isLoading.value = false
                delay(800)
                if (version == feedVersion) {
                    prefetchMore(version, INITIAL_COUNT - 1)
                }
            }.onFailure {
                if (version == feedVersion) {
                    _error.value = "متأسفانه در بارگیری اشعار این شاعر مشکلی پیش آمد."
                    _isLoading.value = false
                }
            }
        }
    }

    private fun prefetchMore(version: Int, count: Int) {
        viewModelScope.launch {
            fetchMutex.withLock {
                if (version != feedVersion) return@launch
                _isFetchingMore.value = true
                val fetched = (0 until count step CONCURRENCY).flatMap { offset ->
                    val batch = minOf(CONCURRENCY, count - offset)
                    (0 until batch).map {
                        async {
                            runCatching {
                                poemRepository.getRandomPoemForFollowedKey(poetKey)
                            }.getOrNull()
                        }
                    }.awaitAll().filterNotNull()
                }
                if (version == feedVersion) {
                    appendUnique(fetched)
                }
                _isFetchingMore.value = false
            }
        }
    }

    fun maybePrefetch() {
        val state = uiState.value
        if (state.isLoading || state.isFetchingMore) return
        if (state.currentIndex >= state.poems.size - PREFETCH_THRESHOLD) {
            prefetchMore(feedVersion, BATCH_SIZE)
        }
    }

    fun goNext() {
        val next = _currentIndex.value + 1
        if (next < _poems.value.size) {
            _currentIndex.value = next
            maybePrefetch()
        } else {
            viewModelScope.launch {
                fetchMutex.withLock {
                    _isFetchingMore.value = true
                    val newPoems = (0 until BATCH_SIZE).mapNotNull {
                        runCatching {
                            poemRepository.getRandomPoemForFollowedKey(poetKey)
                        }.getOrNull()
                    }
                    appendUnique(newPoems)
                    if (next < _poems.value.size) _currentIndex.value = next
                    _isFetchingMore.value = false
                }
            }
        }
    }

    fun goPrevious() {
        _currentIndex.value = (_currentIndex.value - 1).coerceAtLeast(0)
    }

    private fun appendUnique(newPoems: List<Poem>) {
        val existing = _poems.value.map { it.id }.toSet()
        val unique = newPoems.filter { it.id !in existing }
        if (unique.isNotEmpty()) {
            _poems.value = _poems.value + unique
        }
    }

    companion object {
        private const val INITIAL_COUNT = 12
        private const val BATCH_SIZE = 6
        private const val CONCURRENCY = 3
        private const val PREFETCH_THRESHOLD = 5
    }

    class Factory(
        private val poemRepository: PoemRepository,
        private val poetKey: String,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            PoetFeedViewModel(poemRepository, poetKey) as T
    }
}
