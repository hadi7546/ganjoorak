package net.ganjoorak.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import kotlinx.coroutines.launch
import net.ganjoorak.app.audio.PoemAudioPlayer
import net.ganjoorak.app.di.AppContainer
import net.ganjoorak.app.ui.feed.FeedScreen
import net.ganjoorak.app.ui.feed.FeedViewModel
import net.ganjoorak.app.ui.menu.AppDrawer
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GanjoorakNavHost(
    container: AppContainer,
    audioPlayer: PoemAudioPlayer,
    modifier: Modifier = Modifier,
) {
    val navController = rememberNavController()
    val drawerState = rememberDrawerState(initialValue = androidx.compose.material3.DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val settings by container.settingsRepository.settings.collectAsStateWithLifecycle(
        initialValue = net.ganjoorak.app.domain.settings.AppSettings(),
    )

    var showSettings by remember { mutableStateOf(false) }

    val feedViewModel: FeedViewModel = viewModel(
        factory = FeedViewModel.Factory(container.poemRepository, container.settingsRepository),
    )

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            AppDrawer(
                onNavigate = { route ->
                    scope.launch { drawerState.close() }
                    navController.navigate(route) {
                        popUpTo(Routes.FEED) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                onOpenSettings = {
                    scope.launch { drawerState.close() }
                    showSettings = true
                },
                onOpenFeedPoets = {
                    scope.launch { drawerState.close() }
                    feedViewModel.setShowFeedDialog(true)
                },
                onClose = { scope.launch { drawerState.close() } },
            )
        },
        modifier = modifier,
    ) {
        Scaffold { padding ->
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
                        onOpenMenu = { scope.launch { drawerState.open() } },
                        onOpenSearch = { navController.navigate(Routes.SEARCH) },
                        onOpenSettings = { showSettings = true },
                    )
                }
                composable(Routes.POETS) {
                    PoetsScreen(
                        poemRepository = container.poemRepository,
                        onBack = { navController.popBackStack() },
                        onPoemClick = { id -> navController.navigate(Routes.poem(id)) },
                    )
                }
                composable(Routes.SEARCH) {
                    SearchScreen(
                        poemRepository = container.poemRepository,
                        onBack = { navController.popBackStack() },
                        onPoemClick = { id -> navController.navigate(Routes.poem(id)) },
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
                    )
                }
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
        )
    }
}
