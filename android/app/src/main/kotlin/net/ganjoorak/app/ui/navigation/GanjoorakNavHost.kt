package net.ganjoorak.app.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import kotlinx.coroutines.launch
import net.ganjoorak.app.audio.PoemAudioPlayer
import net.ganjoorak.app.di.AppContainer
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.ui.common.LocalAudioBarVisible
import net.ganjoorak.app.ui.feed.FeedScreen
import net.ganjoorak.app.ui.feed.FeedViewModel
import net.ganjoorak.app.ui.feed.PoetFeedScreen
import net.ganjoorak.app.ui.menu.AppMenuSheet
import net.ganjoorak.app.ui.poem.PoemDetailScreen
import net.ganjoorak.app.ui.poets.PoetsScreen
import net.ganjoorak.app.ui.search.SearchScreen
import net.ganjoorak.app.ui.settings.SettingsSheet
import net.ganjoorak.app.util.PoetKeys

object Routes {
    const val FEED = "feed"
    const val POETS = "poets"
    const val SEARCH = "search"
    const val POEM = "poem/{poemId}"
    const val POET = "poet/{source}/{slug}"
    const val POET_PREFIX = "poet/"

    fun poem(id: Int) = "poem/$id"
    fun poet(source: String, slug: String) = "poet/$source/$slug"
}

@Composable
fun GanjoorakNavHost(
    container: AppContainer,
    audioPlayer: PoemAudioPlayer,
    modifier: Modifier = Modifier,
) {
    val navController = rememberNavController()
    val scope = rememberCoroutineScope()

    val settings by container.settingsRepository.settings.collectAsStateWithLifecycle(
        initialValue = AppSettings(),
    )

    var showMenu by remember { mutableStateOf(false) }
    var showSettings by remember { mutableStateOf(false) }
    val audioBarVisible = remember { mutableStateOf(false) }

    val feedViewModel: FeedViewModel = viewModel(
        factory = FeedViewModel.Factory(container.poemRepository, container.settingsRepository),
    )

    val showFloatingChrome = !showMenu && !showSettings

    fun navigateToPoet(poetKey: String) {
        val parsed = PoetKeys.parse(poetKey)
        val sourceName = when (parsed.source) {
            net.ganjoorak.app.data.model.PoemSource.GANJOOR -> "ganjoor"
            net.ganjoorak.app.data.model.PoemSource.CUSTOM -> "custom"
            net.ganjoorak.app.data.model.PoemSource.ECHOLALIA -> "echolalia"
        }
        navController.navigate(Routes.poet(sourceName, parsed.slug)) {
            launchSingleTop = true
        }
    }

    fun navigateHome() {
        navController.navigate(Routes.FEED) {
            popUpTo(navController.graph.findStartDestination().id) {
                saveState = true
            }
            launchSingleTop = true
            restoreState = true
        }
    }

    fun navigatePoets() {
        navController.navigate(Routes.POETS) {
            launchSingleTop = true
        }
    }

    fun navigateSearch() {
        navController.navigate(Routes.SEARCH) {
            launchSingleTop = true
        }
    }

    CompositionLocalProvider(LocalAudioBarVisible provides audioBarVisible) {
        Box(modifier = modifier.fillMaxSize()) {
            NavHost(
                navController = navController,
                startDestination = Routes.FEED,
                modifier = Modifier.fillMaxSize(),
            ) {
                composable(Routes.FEED) {
                    FeedScreen(
                        viewModel = feedViewModel,
                        poemRepository = container.poemRepository,
                        settings = settings,
                        audioPlayer = audioPlayer,
                        onNavigateToPoet = ::navigateToPoet,
                    )
                }
                composable(Routes.POETS) {
                    PoetsScreen(
                        poemRepository = container.poemRepository,
                        onPoetClick = ::navigateToPoet,
                        modifier = Modifier.fillMaxSize(),
                    )
                }
                composable(Routes.SEARCH) {
                    SearchScreen(
                        poemRepository = container.poemRepository,
                        onBack = { navigateHome() },
                        onPoemClick = { id -> navController.navigate(Routes.poem(id)) },
                        modifier = Modifier.fillMaxSize(),
                    )
                }
                composable(
                    route = Routes.POET,
                    arguments = listOf(
                        navArgument("source") { type = NavType.StringType },
                        navArgument("slug") { type = NavType.StringType },
                    ),
                ) { entry ->
                    val source = entry.arguments?.getString("source").orEmpty()
                    val slug = entry.arguments?.getString("slug").orEmpty()
                    val poetKey = "$source:$slug"
                    PoetFeedScreen(
                        poetKey = poetKey,
                        poemRepository = container.poemRepository,
                        settings = settings,
                        audioPlayer = audioPlayer,
                        onNavigateToSamePoet = ::navigateToPoet,
                        modifier = Modifier.fillMaxSize(),
                    )
                }
                composable(
                    route = Routes.POEM,
                    arguments = listOf(navArgument("poemId") { type = NavType.IntType }),
                ) { entry ->
                    val id = entry.arguments?.getInt("poemId") ?: return@composable
                    PoemDetailScreen(
                        poemId = id,
                        settings = settings,
                        poemRepository = container.poemRepository,
                        audioPlayer = audioPlayer,
                        onBack = { navController.popBackStack() },
                        onNavigateToPoet = ::navigateToPoet,
                    )
                }
            }

            FloatingChrome(
                visible = showFloatingChrome,
                isZenLocked = settings.zenScrollLock,
                hasAudioOffset = audioBarVisible.value,
                onOpenMenu = { showMenu = true },
                onOpenSearch = ::navigateSearch,
                onToggleZenLock = {
                    scope.launch {
                        container.settingsRepository.update { it.copy(zenScrollLock = !it.zenScrollLock) }
                    }
                },
                modifier = Modifier.align(Alignment.BottomEnd),
            )
        }
    }

    if (showMenu) {
        AppMenuSheet(
            isZenLocked = settings.zenScrollLock,
            onToggleZenLock = {
                scope.launch {
                    container.settingsRepository.update { it.copy(zenScrollLock = !it.zenScrollLock) }
                }
            },
            onNavigateHome = ::navigateHome,
            onNavigatePoets = ::navigatePoets,
            onOpenFeedPoets = {
                showMenu = false
                navigateHome()
                feedViewModel.setShowFeedDialog(true)
            },
            onOpenSettings = {
                showMenu = false
                showSettings = true
            },
            onDismiss = { showMenu = false },
        )
    }

    if (showSettings) {
        SettingsSheet(
            current = settings,
            onDismiss = { showSettings = false },
            onSave = { updated ->
                scope.launch {
                    container.settingsRepository.update { updated }
                    showSettings = false
                }
            },
            onOpenFeedPoets = {
                showSettings = false
                navigateHome()
                feedViewModel.setShowFeedDialog(true)
            },
        )
    }
}
