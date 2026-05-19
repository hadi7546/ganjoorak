package net.ganjoorak.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors

enum class MainTab(
    val route: String,
    val label: String,
    val icon: ImageVector,
) {
    FEED(Routes.FEED, "خانه", Icons.Default.Home),
    POETS(Routes.POETS, "شاعران", Icons.Default.People),
    SEARCH(Routes.SEARCH, "جستجو", Icons.Default.Search),
    SETTINGS("settings", "تنظیمات", Icons.Default.Settings),
}

@Composable
fun GanjoorakBottomBar(
    currentRoute: String?,
    settingsSheetOpen: Boolean = false,
    onTabSelected: (MainTab) -> Unit,
) {
    val colors = LocalGanjoorakColors.current
    val selected = when {
        settingsSheetOpen -> MainTab.SETTINGS
        else -> MainTab.entries.find { it.route == currentRoute && it != MainTab.SETTINGS } ?: MainTab.FEED
    }

    NavigationBar(
        containerColor = colors.card,
        contentColor = colors.foreground,
    ) {
        MainTab.entries.forEach { tab ->
            NavigationBarItem(
                selected = selected == tab,
                onClick = { onTabSelected(tab) },
                icon = { Icon(tab.icon, contentDescription = tab.label) },
                label = { Text(tab.label) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = colors.foreground,
                    selectedTextColor = colors.foreground,
                    unselectedIconColor = colors.muted,
                    unselectedTextColor = colors.muted,
                    indicatorColor = colors.secondary,
                ),
            )
        }
    }
}
