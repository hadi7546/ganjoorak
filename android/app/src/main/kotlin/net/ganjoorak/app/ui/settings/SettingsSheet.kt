package net.ganjoorak.app.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.outlined.Article
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.domain.settings.AppTheme
import net.ganjoorak.app.domain.settings.PoemFontFamily
import net.ganjoorak.app.domain.settings.PoemViewerVisibility
import net.ganjoorak.app.util.toPersianDigits

@Composable
fun SettingsSheet(
    current: AppSettings,
    onDismiss: () -> Unit,
    onSave: (AppSettings) -> Unit,
) {
    var pending by remember(current) { mutableStateOf(current) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("تنظیمات") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text("پوسته", style = MaterialTheme.typography.titleSmall)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ThemeChip("تاریک", AppTheme.DARK, pending.theme, Icons.Default.DarkMode) {
                        pending = pending.copy(theme = AppTheme.DARK)
                    }
                    ThemeChip("روشن", AppTheme.LIGHT, pending.theme, Icons.Default.LightMode) {
                        pending = pending.copy(theme = AppTheme.LIGHT)
                    }
                    ThemeChip("کاغذی", AppTheme.PAPER, pending.theme, Icons.Outlined.Article) {
                        pending = pending.copy(theme = AppTheme.PAPER)
                    }
                }

                Text("قلم", style = MaterialTheme.typography.titleSmall)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        PoemFontFamily.VAZIRMATN to "وزیرمتن",
                        PoemFontFamily.SAMIM to "صمیم",
                        PoemFontFamily.SHABNAM to "شبنم",
                        PoemFontFamily.GANDOM to "گندم",
                    ).forEach { (font, label) ->
                        FilterChip(
                            selected = pending.fontFamily == font,
                            onClick = { pending = pending.copy(fontFamily = font) },
                            label = { Text(label) },
                        )
                    }
                }

                Text(
                    "اندازه متن: ${pending.poemFontSize.toPersianDigits()}٪",
                    style = MaterialTheme.typography.titleSmall,
                )
                Slider(
                    value = pending.poemFontSize.toFloat(),
                    onValueChange = {
                        pending = pending.copy(poemFontSize = AppSettings.clampFontSize(it.toInt()))
                    },
                    valueRange = AppSettings.POEM_FONT_SIZE_MIN.toFloat()..AppSettings.POEM_FONT_SIZE_MAX.toFloat(),
                    steps = ((AppSettings.POEM_FONT_SIZE_MAX - AppSettings.POEM_FONT_SIZE_MIN) / AppSettings.POEM_FONT_SIZE_STEP) - 1,
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("شماره ابیات")
                    Switch(
                        checked = pending.showLineNumbers,
                        onCheckedChange = { pending = pending.copy(showLineNumbers = it) },
                    )
                }

                VisibilityToggle("نمایش اثر", pending.poemViewerVisibility.titleBreadcrumbs) {
                    pending = pending.copy(
                        poemViewerVisibility = pending.poemViewerVisibility.copy(titleBreadcrumbs = it),
                    )
                }
                VisibilityToggle("پخش‌کننده صوت", pending.poemViewerVisibility.audioPlayer) {
                    pending = pending.copy(
                        poemViewerVisibility = pending.poemViewerVisibility.copy(audioPlayer = it),
                    )
                }
                VisibilityToggle("دکمه‌های اشتراک", pending.poemViewerVisibility.actionButtons) {
                    pending = pending.copy(
                        poemViewerVisibility = pending.poemViewerVisibility.copy(actionButtons = it),
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("شعر تصادفی")
                    Switch(
                        checked = pending.randomizePoems,
                        onCheckedChange = { pending = pending.copy(randomizePoems = it) },
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("حالت ذن (قفل ورق‌زدن)")
                    Switch(
                        checked = pending.zenScrollLock,
                        onCheckedChange = { pending = pending.copy(zenScrollLock = it) },
                    )
                }
            }
        },
        confirmButton = {
            Button(onClick = { onSave(pending) }) { Text("ذخیره") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("لغو") }
        },
    )
}

@Composable
private fun ThemeChip(
    label: String,
    theme: AppTheme,
    selected: AppTheme,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
) {
    FilterChip(
        selected = selected == theme,
        onClick = onClick,
        label = { Text(label) },
        leadingIcon = { Icon(icon, contentDescription = null) },
    )
}

@Composable
private fun VisibilityToggle(
    label: String,
    checked: Boolean,
    onChecked: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label)
        Switch(checked = checked, onCheckedChange = onChecked)
    }
}
