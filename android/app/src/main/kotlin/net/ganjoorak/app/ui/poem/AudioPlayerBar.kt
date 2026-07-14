package net.ganjoorak.app.ui.poem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import net.ganjoorak.app.data.model.PoemRecitation
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors
import net.ganjoorak.app.util.toPersianTime

@Composable
fun AudioPlayerBar(
    recitation: PoemRecitation?,
    recitationIndex: Int,
    recitationCount: Int,
    isPlaying: Boolean,
    isLoading: Boolean,
    currentTimeSec: Float,
    durationSec: Float,
    onTogglePlay: () -> Unit,
    onPreviousRecitation: () -> Unit,
    onNextRecitation: () -> Unit,
    onSeek: (Float) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (recitation == null || recitation.mp3Url.isBlank()) return

    val colors = LocalGanjoorakColors.current
    val progress = if (durationSec > 0) currentTimeSec / durationSec else 0f

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.background.copy(alpha = 0.92f))
            .padding(horizontal = 12.dp, vertical = 8.dp)
            .padding(bottom = 4.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            IconButton(
                onClick = onPreviousRecitation,
                enabled = recitationIndex > 0,
                modifier = Modifier.size(32.dp),
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = "خوانش قبلی",
                    tint = colors.foreground,
                    modifier = Modifier.size(22.dp),
                )
            }
            IconButton(
                onClick = onTogglePlay,
                modifier = Modifier.size(36.dp),
            ) {
                when {
                    isLoading -> CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = colors.foreground,
                        strokeWidth = 2.dp,
                    )
                    isPlaying -> Icon(
                        Icons.Default.Pause,
                        contentDescription = "توقف",
                        tint = colors.foreground,
                        modifier = Modifier.size(24.dp),
                    )
                    else -> Icon(
                        Icons.Default.PlayArrow,
                        contentDescription = "پخش",
                        tint = colors.foreground,
                        modifier = Modifier.size(24.dp),
                    )
                }
            }
            IconButton(
                onClick = onNextRecitation,
                enabled = recitationIndex < recitationCount - 1,
                modifier = Modifier.size(32.dp),
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = "خوانش بعدی",
                    tint = colors.foreground,
                    modifier = Modifier.size(22.dp),
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = recitation.audioArtist.ifBlank { recitation.audioTitle },
                    style = MaterialTheme.typography.labelMedium,
                    color = colors.foreground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = "${currentTimeSec.toPersianTime()} / ${durationSec.toPersianTime()}",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.muted,
                )
            }
        }

        LinearProgressIndicator(
            progress = { progress.coerceIn(0f, 1f) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 4.dp)
                .height(3.dp),
            color = colors.foreground,
            trackColor = colors.border,
        )
    }
}
