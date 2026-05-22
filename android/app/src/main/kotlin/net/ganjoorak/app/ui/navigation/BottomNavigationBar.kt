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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import net.ganjoorak.app.R
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors

private val NavFontFamily = FontFamily(Font(R.font.vazirmatn))

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
        currentRoute?.startsWith(Routes.POET_PREFIX) == true -> null
        else -> MainTab.entries.find { it.route == currentRoute && it != MainTab.SETTINGS } ?: MainTab.FEED
    }
    val navLabelStyle = TextStyle(
        fontFamily = NavFontFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
    )

    NavigationBar(
        containerColor = colors.card,
        contentColor = colors.foreground,
    ) {
        MainTab.entries.forEach { tab ->
            NavigationBarItem(
                selected = selected == tab,
                onClick = { onTabSelected(tab) },
                icon = { Icon(tab.icon, contentDescription = tab.label) },
                label = { Text(tab.label, style = navLabelStyle) },
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
