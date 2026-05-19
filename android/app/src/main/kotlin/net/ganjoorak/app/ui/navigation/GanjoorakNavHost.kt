package net.ganjoorak.app.ui.navigation

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import kotlinx.coroutines.launch
import net.ganjoorak.app.audio.PoemAudioPlayer
import net.ganjoorak.app.di.AppContainer
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.ui.feed.FeedScreen
import net.ganjoorak.app.ui.feed.FeedViewModel
import net.ganjoorak.app.ui.poem.PoemDetailScreen
import net.ganjoorak.app.ui.poets.PoetsScreen
import net.ganjoorak.app.ui.search.SearchScreen
import net.ganjoorak.app.ui.settings.SettingsSheet

object Routes {
    const val FEED = "feed"
    const val POETS = "poets"
    const val SEARCH = "search"
    const val POEM = "poem/{poemId}"
    fun poem(id: Int) = "poem/$id"
}

@Composable
fun GanjoorakNavHost(
    container: AppContainer,
    audioPlayer: PoemAudioPlayer,
    modifier: Modifier = Modifier,
) {
    val navController = rememberNavController()
    val scope = rememberCoroutineScope()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val settings by container.settingsRepository.settings.collectAsStateWithLifecycle(
        initialValue = AppSettings(),
    )

    var showSettings by remember { mutableStateOf(false) }

    val feedViewModel: FeedViewModel = viewModel(
        factory = FeedViewModel.Factory(container.poemRepository, container.settingsRepository),
    )

    val showBottomBar = currentRoute?.startsWith("poem/") != true

    fun navigateToTab(tab: MainTab) {
        if (tab == MainTab.SETTINGS) {
            showSettings = true
            return
        }
        navController.navigate(tab.route) {
            popUpTo(navController.graph.findStartDestination().id) {
                saveState = true
            }
            launchSingleTop = true
            restoreState = true
        }
    }

    Scaffold(
        modifier = modifier,
        bottomBar = {
            if (showBottomBar) {
                GanjoorakBottomBar(
                    currentRoute = currentRoute,
                    settingsSheetOpen = showSettings,
                    onTabSelected = ::navigateToTab,
                )
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Routes.FEED,
            modifier = Modifier.padding(padding),
        ) {
            composable(Routes.FEED) {
                FeedScreen(
                    viewModel = feedViewModel,
                    poemRepository = container.poemRepository,
                    settings = settings,
                    audioPlayer = audioPlayer,
                    onOpenSearch = { navigateToTab(MainTab.SEARCH) },
                    onToggleZenLock = {
                        scope.launch {
                            container.settingsRepository.update {
                                it.copy(zenScrollLock = !it.zenScrollLock)
                            }
                        }
                    },
                    onNavigateToPoets = { navigateToTab(MainTab.POETS) },
                )
            }
            composable(Routes.POETS) {
                PoetsScreen(
                    poemRepository = container.poemRepository,
                    modifier = Modifier.fillMaxSize(),
                )
            }
            composable(Routes.SEARCH) {
                SearchScreen(
                    poemRepository = container.poemRepository,
                    onBack = { navigateToTab(MainTab.FEED) },
                    onPoemClick = { id -> navController.navigate(Routes.poem(id)) },
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
                    onOpenSearch = { navigateToTab(MainTab.SEARCH) },
                    onToggleZenLock = {
                        scope.launch {
                            container.settingsRepository.update {
                                it.copy(zenScrollLock = !it.zenScrollLock)
                            }
                        }
                    },
                    onNavigateToPoets = { navigateToTab(MainTab.POETS) },
                )
            }
        }
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
                navigateToTab(MainTab.FEED)
                feedViewModel.setShowFeedDialog(true)
            },
        )
    }
}
