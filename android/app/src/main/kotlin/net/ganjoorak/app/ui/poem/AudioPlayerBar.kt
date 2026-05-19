package net.ganjoorak.app.ui.poem

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
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
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = recitation.audioArtist.ifBlank { "خوانش" },
                style = MaterialTheme.typography.labelLarge,
                color = colors.muted,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = "${currentTimeSec.toPersianTime()} / ${durationSec.toPersianTime()}",
                style = MaterialTheme.typography.labelLarge,
                color = colors.muted,
            )
        }
        LinearProgressIndicator(
            progress = { progress.coerceIn(0f, 1f) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            color = colors.foreground,
            trackColor = colors.border,
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = onPreviousRecitation,
                enabled = recitationIndex > 0,
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = "خوانش قبلی",
                    tint = colors.foreground,
                )
            }
            IconButton(onClick = onTogglePlay, modifier = Modifier.size(56.dp)) {
                when {
                    isLoading -> CircularProgressIndicator(modifier = Modifier.size(28.dp))
                    isPlaying -> Icon(Icons.Default.Pause, contentDescription = "توقف", tint = colors.foreground)
                    else -> Icon(Icons.Default.PlayArrow, contentDescription = "پخش", tint = colors.foreground)
                }
            }
            IconButton(
                onClick = onNextRecitation,
                enabled = recitationIndex < recitationCount - 1,
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = "خوانش بعدی",
                    tint = colors.foreground,
                )
            }
        }
        Text(
            text = recitation.audioTitle,
            style = MaterialTheme.typography.bodySmall,
            color = colors.muted,
            modifier = Modifier.align(Alignment.CenterHorizontally),
        )
    }
}
