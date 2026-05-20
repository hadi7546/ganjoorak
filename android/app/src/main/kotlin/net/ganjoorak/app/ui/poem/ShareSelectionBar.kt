package net.ganjoorak.app.ui.poem

import android.graphics.Bitmap
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.share.SHARE_THEMES
import net.ganjoorak.app.share.ShareImageGenerator
import net.ganjoorak.app.share.ShareImageLayout
import net.ganjoorak.app.share.ShareThemeId
import net.ganjoorak.app.share.buildShareText
import net.ganjoorak.app.share.copyShareText
import net.ganjoorak.app.share.shareBitmapFile
import net.ganjoorak.app.share.shareTextIntent
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors
import net.ganjoorak.app.util.toPersianDigits

@Composable
fun ShareModeHeader(
    poemTitle: String,
    selectedCount: Int,
    totalLines: Int,
    onClose: () -> Unit,
    onToggleSelectAll: () -> Unit,
    allSelected: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = LocalGanjoorakColors.current

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.card.copy(alpha = 0.95f))
            .padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onClose) {
            Icon(Icons.Default.Close, contentDescription = "بستن", tint = colors.foreground)
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "انتخاب برای اشتراک",
                style = MaterialTheme.typography.titleMedium,
                color = colors.foreground,
            )
            Text(
                text = poemTitle,
                style = MaterialTheme.typography.bodySmall,
                color = colors.muted,
                maxLines = 1,
            )
        }
        TextButton(onClick = onToggleSelectAll) {
            Text(
                text = if (allSelected) "لغو همه" else "انتخاب همه",
                color = colors.foreground,
            )
        }
    }
    Text(
        text = "${selectedCount.toPersianDigits()} از ${totalLines.toPersianDigits()} مصرع",
        style = MaterialTheme.typography.labelMedium,
        color = colors.muted,
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.card.copy(alpha = 0.95f))
            .padding(horizontal = 20.dp, vertical = 4.dp),
    )
}

@Composable
fun ShareSelectionBar(
    poem: Poem,
    settings: AppSettings,
    selectedLineIndices: Set<Int>,
    allLines: List<String>,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val colors = LocalGanjoorakColors.current

    var selectedThemeId by remember { mutableStateOf(ShareThemeId.NIGHT) }
    var selectedLayout by remember { mutableStateOf(ShareImageLayout.SINGLE) }
    var showPreview by remember { mutableStateOf(false) }
    var previewImage by remember { mutableStateOf<androidx.compose.ui.graphics.ImageBitmap?>(null) }
    var shareBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var isGenerating by remember { mutableStateOf(false) }

    val selectedTheme = SHARE_THEMES.first { it.id == selectedThemeId }
    val selectedTextLines = remember(selectedLineIndices, allLines) {
        selectedLineIndices.sorted().mapNotNull { allLines.getOrNull(it) }
    }
    val shareText = remember(selectedTextLines, poem.id) {
        buildShareText(poem, selectedTextLines)
    }
    val hasSelection = selectedTextLines.isNotEmpty()

    LaunchedEffect(selectedLineIndices, selectedThemeId, selectedLayout, settings.fontFamily) {
        if (!hasSelection) {
            shareBitmap?.recycle()
            shareBitmap = null
            previewImage = null
            return@LaunchedEffect
        }
        isGenerating = true
        try {
            val bitmap = ShareImageGenerator.generate(
                context = context.applicationContext,
                poem = poem,
                lines = selectedTextLines,
                theme = selectedTheme,
                fontFamily = settings.fontFamily,
                layout = selectedLayout,
            )
            shareBitmap?.recycle()
            shareBitmap = bitmap
            previewImage = bitmap.asImageBitmap()
        } catch (_: Exception) {
            shareBitmap?.recycle()
            shareBitmap = null
            previewImage = null
        } finally {
            isGenerating = false
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            shareBitmap?.recycle()
            shareBitmap = null
            previewImage = null
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.card),
    ) {
        HorizontalDivider(color = colors.border.copy(alpha = 0.4f))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            SHARE_THEMES.forEach { theme ->
                FilterChip(
                    selected = selectedThemeId == theme.id,
                    onClick = { selectedThemeId = theme.id },
                    label = { Text(theme.label) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = colors.secondary,
                        selectedLabelColor = colors.foreground,
                    ),
                )
            }
            FilterChip(
                selected = selectedLayout == ShareImageLayout.SINGLE,
                onClick = { selectedLayout = ShareImageLayout.SINGLE },
                label = { Text("تک‌ستون") },
            )
            FilterChip(
                selected = selectedLayout == ShareImageLayout.COUPLET,
                onClick = { selectedLayout = ShareImageLayout.COUPLET },
                label = { Text("دوستون") },
            )
            FilterChip(
                selected = showPreview,
                onClick = { showPreview = !showPreview },
                label = { Text("پیش‌نمایش") },
                enabled = hasSelection,
            )
        }

        AnimatedVisibility(visible = showPreview && hasSelection) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 200.dp)
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(colors.background),
                contentAlignment = Alignment.Center,
            ) {
                when {
                    isGenerating -> CircularProgressIndicator(
                        modifier = Modifier.size(28.dp),
                        color = colors.foreground,
                    )
                    previewImage != null -> Image(
                        bitmap = previewImage!!,
                        contentDescription = "پیش‌نمایش",
                        modifier = Modifier.fillMaxWidth(),
                        contentScale = ContentScale.Fit,
                    )
                }
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedButton(
                onClick = {
                    copyShareText(context, shareText)
                    Toast.makeText(context, "متن کپی شد", Toast.LENGTH_SHORT).show()
                },
                enabled = hasSelection,
                modifier = Modifier.weight(1f),
            ) {
                Icon(Icons.Default.ContentCopy, null, Modifier.size(18.dp))
                Text("کپی", modifier = Modifier.padding(start = 4.dp))
            }
            OutlinedButton(
                onClick = { shareTextIntent(context, shareText) },
                enabled = hasSelection,
                modifier = Modifier.weight(1f),
            ) {
                Icon(Icons.Default.Share, null, Modifier.size(18.dp))
                Text("متن", modifier = Modifier.padding(start = 4.dp))
            }
            OutlinedButton(
                onClick = {
                    val bitmap = shareBitmap ?: return@OutlinedButton
                    shareBitmapFile(context, bitmap, poem.id)
                },
                enabled = hasSelection && shareBitmap != null && !isGenerating,
                modifier = Modifier.weight(1f),
            ) {
                Icon(Icons.Default.Image, null, Modifier.size(18.dp))
                Text("تصویر", modifier = Modifier.padding(start = 4.dp))
            }
        }
    }
}
