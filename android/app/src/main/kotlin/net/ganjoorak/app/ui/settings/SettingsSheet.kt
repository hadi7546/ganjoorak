package net.ganjoorak.app.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.domain.settings.AppTheme
import net.ganjoorak.app.domain.settings.PoemFontFamily
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors
import net.ganjoorak.app.util.toPersianDigits

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SettingsSheet(
    current: AppSettings,
    onDismiss: () -> Unit,
    onSave: (AppSettings) -> Unit,
    onOpenFeedPoets: (() -> Unit)? = null,
) {
    var pending by remember(current) { mutableStateOf(current) }
    val colors = LocalGanjoorakColors.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = colors.card,
        contentColor = colors.foreground,
        tonalElevation = 0.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
                .padding(bottom = 16.dp),
        ) {
            Text(
                text = "تنظیمات",
                style = MaterialTheme.typography.headlineSmall,
                color = colors.foreground,
                modifier = Modifier.padding(bottom = 16.dp),
            )

            Column(
                modifier = Modifier
                    .heightIn(max = 520.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                if (onOpenFeedPoets != null) {
                    TextButton(onClick = onOpenFeedPoets) {
                        Text("شاعران صفحه اصلی", color = colors.foreground)
                    }
                }
                SettingsSection(title = "پوسته") {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        ThemeChip("تاریک", AppTheme.DARK, pending.theme, Icons.Default.DarkMode) {
                            pending = pending.copy(theme = AppTheme.DARK)
                        }
                        ThemeChip("روشن", AppTheme.LIGHT, pending.theme, Icons.Default.LightMode) {
                            pending = pending.copy(theme = AppTheme.LIGHT)
                        }
                        ThemeChip("کاغذی", AppTheme.PAPER, pending.theme, Icons.AutoMirrored.Filled.Article) {
                            pending = pending.copy(theme = AppTheme.PAPER)
                        }
                    }
                }

                SettingsSection(title = "قلم") {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        listOf(
                            PoemFontFamily.VAZIRMATN to "وزیرمتن",
                            PoemFontFamily.SAMIM to "صمیم",
                            PoemFontFamily.SHABNAM to "شبنم",
                            PoemFontFamily.GANDOM to "گندم",
                        ).forEach { (font, label) ->
                            FontChip(
                                label = label,
                                selected = pending.fontFamily == font,
                                onClick = { pending = pending.copy(fontFamily = font) },
                            )
                        }
                    }
                }

                SettingsSection(
                    title = "اندازه متن: ${pending.poemFontSize.toPersianDigits()}٪",
                ) {
                    Slider(
                        value = pending.poemFontSize.toFloat(),
                        onValueChange = {
                            pending = pending.copy(poemFontSize = AppSettings.clampFontSize(it.toInt()))
                        },
                        valueRange = AppSettings.POEM_FONT_SIZE_MIN.toFloat()..AppSettings.POEM_FONT_SIZE_MAX.toFloat(),
                        steps = ((AppSettings.POEM_FONT_SIZE_MAX - AppSettings.POEM_FONT_SIZE_MIN) /
                            AppSettings.POEM_FONT_SIZE_STEP) - 1,
                        colors = SliderDefaults.colors(
                            thumbColor = colors.foreground,
                            activeTrackColor = colors.foreground,
                            inactiveTrackColor = colors.border,
                        ),
                    )
                }

                SwitchRow("شماره ابیات", pending.showLineNumbers) {
                    pending = pending.copy(showLineNumbers = it)
                }
                SwitchRow("نمایش اثر", pending.poemViewerVisibility.titleBreadcrumbs) {
                    pending = pending.copy(
                        poemViewerVisibility = pending.poemViewerVisibility.copy(titleBreadcrumbs = it),
                    )
                }
                SwitchRow("پخش‌کننده صوت", pending.poemViewerVisibility.audioPlayer) {
                    pending = pending.copy(
                        poemViewerVisibility = pending.poemViewerVisibility.copy(audioPlayer = it),
                    )
                }
                SwitchRow("دکمه‌های اشتراک و شاعر", pending.poemViewerVisibility.actionButtons) {
                    pending = pending.copy(
                        poemViewerVisibility = pending.poemViewerVisibility.copy(actionButtons = it),
                    )
                }
                SwitchRow("شعر تصادفی", pending.randomizePoems) {
                    pending = pending.copy(randomizePoems = it)
                }
                SwitchRow("حالت ذن (قفل ورق‌زدن)", pending.zenScrollLock) {
                    pending = pending.copy(zenScrollLock = it)
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
            ) {
                TextButton(onClick = onDismiss) {
                    Text("لغو", color = colors.muted)
                }
                Button(
                    onClick = { onSave(pending) },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("ذخیره")
                }
            }
        }
    }
}

@Composable
private fun SettingsSection(
    title: String,
    content: @Composable () -> Unit,
) {
    val colors = LocalGanjoorakColors.current
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            color = colors.foreground,
        )
        content()
    }
}

@Composable
private fun ThemeChip(
    label: String,
    theme: AppTheme,
    selected: AppTheme,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
) {
    val colors = LocalGanjoorakColors.current
    FilterChip(
        selected = selected == theme,
        onClick = onClick,
        label = { Text(label) },
        leadingIcon = { Icon(icon, contentDescription = null) },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = colors.secondary,
            selectedLabelColor = colors.foreground,
            containerColor = colors.background,
            labelColor = colors.muted,
        ),
    )
}

@Composable
private fun FontChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val colors = LocalGanjoorakColors.current
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = colors.secondary,
            selectedLabelColor = colors.foreground,
            containerColor = colors.background,
            labelColor = colors.muted,
        ),
    )
}

@Composable
private fun SwitchRow(
    label: String,
    checked: Boolean,
    onChecked: (Boolean) -> Unit,
) {
    val colors = LocalGanjoorakColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = colors.foreground,
            modifier = Modifier.weight(1f).padding(end = 12.dp),
        )
        Switch(
            checked = checked,
            onCheckedChange = onChecked,
            colors = SwitchDefaults.colors(
                checkedThumbColor = colors.foreground,
                checkedTrackColor = colors.muted,
                uncheckedThumbColor = colors.muted,
                uncheckedTrackColor = colors.border,
            ),
        )
    }
}
