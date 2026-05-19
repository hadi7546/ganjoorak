package net.ganjoorak.app.ui.menu

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import net.ganjoorak.app.ui.navigation.Routes

@Composable
fun AppDrawer(
    onNavigate: (String) -> Unit,
    onOpenSettings: () -> Unit,
    onOpenFeedPoets: () -> Unit,
    onClose: () -> Unit,
) {
    ModalDrawerSheet(
        modifier = Modifier
            .width(300.dp)
            .fillMaxHeight(),
    ) {
        Text(
            text = "گنجورک",
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.padding(24.dp),
        )
        NavigationDrawerItem(
            label = { Text("صفحه اصلی") },
            selected = false,
            icon = { Icon(Icons.Default.Home, contentDescription = null) },
            onClick = { onNavigate(Routes.FEED); onClose() },
        )
        NavigationDrawerItem(
            label = { Text("شاعران") },
            selected = false,
            icon = { Icon(Icons.Default.People, contentDescription = null) },
            onClick = { onNavigate(Routes.POETS); onClose() },
        )
        NavigationDrawerItem(
            label = { Text("جستجو") },
            selected = false,
            icon = { Icon(Icons.Default.Search, contentDescription = null) },
            onClick = { onNavigate(Routes.SEARCH); onClose() },
        )
        NavigationDrawerItem(
            label = { Text("شاعران صفحه اصلی") },
            selected = false,
            onClick = onOpenFeedPoets,
        )
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
        NavigationDrawerItem(
            label = { Text("تنظیمات") },
            selected = false,
            icon = { Icon(Icons.Default.Settings, contentDescription = null) },
            onClick = onOpenSettings,
        )
    }
}
