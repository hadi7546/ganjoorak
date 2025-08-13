package com.example.ganjoorak.ui

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.ganjoorak.ui.main.MainScreen
import com.example.ganjoorak.ui.poetdetail.PoetDetailScreen
import com.example.ganjoorak.ui.poets.PoetsScreen

sealed class Screen(val route: String) {
    object Main : Screen("main")
    object Poets : Screen("poets")
    object PoetDetail : Screen("poet_detail/{poetSlug}") {
        fun createRoute(poetSlug: String) = "poet_detail/$poetSlug"
    }
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = Screen.Main.route) {
        composable(Screen.Main.route) {
            MainScreen(
                onPoetsClick = { navController.navigate(Screen.Poets.route) }
            )
        }
        composable(Screen.Poets.route) {
            PoetsScreen(
                onPoetClick = { poetSlug ->
                    navController.navigate(Screen.PoetDetail.createRoute(poetSlug))
                }
            )
        }
        composable(
            route = Screen.PoetDetail.route,
            arguments = listOf(navArgument("poetSlug") { type = NavType.StringType })
        ) { backStackEntry ->
            val poetSlug = backStackEntry.arguments?.getString("poetSlug")
            requireNotNull(poetSlug) { "poetSlug parameter wasn't found. Please make sure it's set!" }
            PoetDetailScreen(poetSlug = poetSlug)
        }
    }
}
