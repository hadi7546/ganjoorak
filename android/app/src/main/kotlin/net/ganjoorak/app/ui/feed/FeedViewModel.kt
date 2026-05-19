package net.ganjoorak.app.ui.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.data.model.Poet
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.domain.settings.SettingsRepository
import net.ganjoorak.app.util.PoetKeys

data class FeedUiState(
    val poems: List<Poem> = emptyList(),
    val currentIndex: Int = 0,
    val isLoading: Boolean = true,
    val isFetchingMore: Boolean = false,
    val error: String? = null,
    val availablePoets: List<Poet> = emptyList(),
    val showFeedPoetDialog: Boolean = false,
)

class FeedViewModel(
    private val poemRepository: PoemRepository,
    private val settingsRepository: SettingsRepository,
) : ViewModel() {
    private val _poems = MutableStateFlow<List<Poem>>(emptyList())
    private val _currentIndex = MutableStateFlow(0)
    private val _isLoading = MutableStateFlow(true)
    private val _isFetchingMore = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)
    private val _availablePoets = MutableStateFlow<List<Poet>>(emptyList())
    private val _showFeedDialog = MutableStateFlow(false)

    private val fetchMutex = Mutex()
    private var feedVersion = 0

    val settings: StateFlow<AppSettings> = settingsRepository.settings.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        AppSettings(),
    )

    val uiState: StateFlow<FeedUiState> = combine(
        combine(_poems, _currentIndex, _isLoading, _isFetchingMore, _error) {
                poems,
                index,
                loading,
                fetchingMore,
                error,
            ->
            FeedUiState(
                poems = poems,
                currentIndex = index,
                isLoading = loading,
                isFetchingMore = fetchingMore,
                error = error,
            )
        },
        _availablePoets,
        _showFeedDialog,
    ) { partial, poets, showDialog ->
        partial.copy(
            availablePoets = poets,
            showFeedPoetDialog = showDialog,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), FeedUiState())

    init {
        viewModelScope.launch {
            settings
                .map { it.followedPoetKeys }
                .distinctUntilChanged()
                .drop(1)
                .collect { refreshFeed() }
        }
        refreshFeed()
        loadPoets()
    }

    fun setCurrentIndex(index: Int) {
        _currentIndex.value = index.coerceIn(0, (_poems.value.size - 1).coerceAtLeast(0))
        maybePrefetch()
    }

    private fun loadPoets() {
        viewModelScope.launch {
            runCatching {
                val ganjoor = async { poemRepository.getPoets() }
                val custom = async { poemRepository.getCustomPoets() }
                val echolalia = async { poemRepository.getEcholaliaPoets() }
                _availablePoets.value = (ganjoor.await() + custom.await() + echolalia.await())
                    .filter { it.published }
                    .sortedBy { it.nickname ?: it.name }
            }
        }
    }

    fun refreshFeed() {
        viewModelScope.launch {
            val version = ++feedVersion
            _isLoading.value = true
            _error.value = null
            _currentIndex.value = 0
            runCatching {
                val first = fetchRandomPoem()
                if (version != feedVersion) return@launch
                _poems.value = listOf(first)
                _isLoading.value = false
                prefetchMore(version, INITIAL_COUNT - 1)
            }.onFailure {
                if (version == feedVersion) {
                    _error.value = "متأسفانه در بارگیری شعرها مشکلی پیش آمد. لطفاً دوباره تلاش کنید."
                    _isLoading.value = false
                }
            }
        }
    }

    private suspend fun fetchRandomPoem(): Poem {
        val keys = settings.value.followedPoetKeys
        return if (keys.isEmpty()) {
            poemRepository.getRandomGanjoorPoem()
        } else {
            val key = keys.random()
            poemRepository.getRandomPoemForFollowedKey(key)
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
                            runCatching { fetchRandomPoem() }.getOrNull()
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
                    val newPoems = runCatching { fetchBatch(BATCH_SIZE) }.getOrDefault(emptyList())
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

    private suspend fun fetchBatch(count: Int): List<Poem> {
        return (0 until count).mapNotNull {
            runCatching { fetchRandomPoem() }.getOrNull()
        }
    }

    private fun appendUnique(newPoems: List<Poem>) {
        val existing = _poems.value.map { it.id }.toSet()
        val unique = newPoems.filter { it.id !in existing }
        if (unique.isNotEmpty()) {
            _poems.value = _poems.value + unique
        }
    }

    fun setShowFeedDialog(show: Boolean) {
        _showFeedDialog.value = show
    }

    fun saveFollowedPoets(keys: List<String>) {
        viewModelScope.launch {
            settingsRepository.update { it.copy(followedPoetKeys = keys) }
            _showFeedDialog.value = false
            refreshFeed()
        }
    }

    fun effectiveFollowedKeys(): List<String> {
        val keys = settings.value.followedPoetKeys
        if (keys.isNotEmpty()) return keys
        return _availablePoets.value
            .filter { it.source == net.ganjoorak.app.data.model.PoemSource.GANJOOR }
            .map { PoetKeys.key(it) }
    }

    companion object {
        private const val INITIAL_COUNT = 12
        private const val BATCH_SIZE = 6
        private const val CONCURRENCY = 3
        private const val PREFETCH_THRESHOLD = 5
    }

    class Factory(
        private val poemRepository: PoemRepository,
        private val settingsRepository: SettingsRepository,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            FeedViewModel(poemRepository, settingsRepository) as T
    }
}
