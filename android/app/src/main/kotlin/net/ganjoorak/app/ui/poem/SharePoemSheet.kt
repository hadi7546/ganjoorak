package net.ganjoorak.app.ui.poem

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.domain.settings.PoemFontFamily
import net.ganjoorak.app.share.SHARE_THEMES
import net.ganjoorak.app.share.ShareImageGenerator
import net.ganjoorak.app.share.ShareImageLayout
import net.ganjoorak.app.share.ShareThemeId
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors
import net.ganjoorak.app.util.toPersianDigits
import java.io.File
import java.io.FileOutputStream

private fun buildPoemUrl(poem: Poem): String {
    return if (poem.isCustom) {
        "https://ganjoorak.ir/${poem.poetSlug}/${poem.id}"
    } else {
        "https://ganjoorak.ir/poem/${poem.id}"
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SharePoemSheet(
    poem: Poem,
    settings: AppSettings,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    val colors = LocalGanjoorakColors.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false)

    val allLines = remember(poem.id) {
        poem.plainText.lines().map { it.trim() }.filter { it.isNotBlank() }
    }

    var selectedLineIndices by remember(poem.id) {
        mutableStateOf(allLines.indices.take(minOf(4, allLines.size)).toSet())
    }
    var selectedThemeId by remember { mutableStateOf(ShareThemeId.NIGHT) }
    var selectedLayout by remember { mutableStateOf(ShareImageLayout.SINGLE) }
    var selectedFont by remember(settings.fontFamily) { mutableStateOf(settings.fontFamily) }
    var previewImage by remember { mutableStateOf<ImageBitmap?>(null) }
    var shareBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var isGenerating by remember { mutableStateOf(false) }

    val selectedTheme = SHARE_THEMES.first { it.id == selectedThemeId }
    val selectedTextLines = remember(selectedLineIndices, allLines) {
        selectedLineIndices.sorted().mapNotNull { allLines.getOrNull(it) }
    }
    val poemUrl = remember(poem.id) { buildPoemUrl(poem) }
    val shareText = remember(selectedTextLines, poem.id) {
        buildString {
            append(selectedTextLines.joinToString("\n"))
            append("\n\n")
            append("${poem.title} - ${poem.poet}")
            append("\n")
            append(poemUrl)
        }
    }

    LaunchedEffect(
        poem.id,
        selectedLineIndices,
        selectedThemeId,
        selectedLayout,
        selectedFont,
    ) {
        if (selectedTextLines.isEmpty()) {
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
                fontFamily = selectedFont,
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
                .padding(bottom = 16.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Text(
                text = "اشتراک شعر",
                style = MaterialTheme.typography.headlineSmall,
                color = colors.foreground,
                modifier = Modifier.padding(bottom = 12.dp),
            )

            Text(
                text = "${selectedLineIndices.size.toPersianDigits()} مصرع انتخاب شده",
                style = MaterialTheme.typography.bodyMedium,
                color = colors.muted,
                modifier = Modifier.padding(bottom = 8.dp),
            )

            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 12.dp),
            ) {
                allLines.forEachIndexed { index, line ->
                    val selected = index in selectedLineIndices
                    FilterChip(
                        selected = selected,
                        onClick = {
                            selectedLineIndices = if (selected) {
                                selectedLineIndices - index
                            } else {
                                selectedLineIndices + index
                            }
                        },
                        label = {
                            Text(
                                text = line.take(28) + if (line.length > 28) "…" else "",
                                maxLines = 1,
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = colors.secondary,
                            selectedLabelColor = colors.foreground,
                        ),
                    )
                }
            }

            Text(text = "پوسته", style = MaterialTheme.typography.labelLarge, color = colors.muted)
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(vertical = 8.dp),
            ) {
                SHARE_THEMES.forEach { theme ->
                    FilterChip(
                        selected = selectedThemeId == theme.id,
                        onClick = { selectedThemeId = theme.id },
                        label = { Text(theme.label) },
                    )
                }
            }

            Text(text = "چیدمان", style = MaterialTheme.typography.labelLarge, color = colors.muted)
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(vertical = 8.dp),
            ) {
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
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 200.dp, max = 360.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(colors.background)
                    .border(1.dp, colors.border, RoundedCornerShape(12.dp))
                    .padding(8.dp),
                contentAlignment = Alignment.Center,
            ) {
                when {
                    isGenerating -> CircularProgressIndicator(color = colors.foreground)
                    previewImage != null -> Image(
                        bitmap = previewImage!!,
                        contentDescription = "پیش‌نمایش تصویر اشتراک",
                        modifier = Modifier.fillMaxWidth(),
                        contentScale = ContentScale.Fit,
                    )
                    else -> Text("خطی را برای پیش‌نمایش انتخاب کنید", color = colors.muted)
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick = {
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        clipboard.setPrimaryClip(ClipData.newPlainText("poem", shareText))
                        Toast.makeText(context, "متن کپی شد", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(18.dp))
                    Text("کپی متن", modifier = Modifier.padding(start = 6.dp))
                }
                Button(
                    onClick = {
                        val bitmap = shareBitmap ?: return@Button
                        shareBitmap(context, bitmap, poem.id)
                    },
                    enabled = shareBitmap != null && !isGenerating,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                    Text("اشتراک تصویر", modifier = Modifier.padding(start = 6.dp))
                }
            }

            OutlinedButton(
                onClick = {
                    context.startActivity(
                        Intent.createChooser(
                            Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, shareText)
                            },
                            "اشتراک متن",
                        ),
                    )
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
            ) {
                Icon(Icons.Default.Image, contentDescription = null, modifier = Modifier.size(18.dp))
                Text("اشتراک متن", modifier = Modifier.padding(start = 6.dp))
            }
        }
    }
}

private fun shareBitmap(context: Context, bitmap: Bitmap, poemId: Int) {
    val dir = File(context.cacheDir, "share").apply { mkdirs() }
    val file = File(dir, "ganjoorak-poem-$poemId.png")
    FileOutputStream(file).use { out ->
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
    }
    val uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "اشتراک تصویر شعر"))
}
