package net.ganjoorak.app.ui.poem

import androidx.compose.foundation.background
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
            .background(colors.card.copy(alpha = 0.96f))
            .padding(horizontal = 16.dp, vertical = 10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                IconButton(
                    onClick = onPreviousRecitation,
                    enabled = recitationIndex > 0,
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = "خوانش قبلی",
                        tint = colors.foreground,
                    )
                }
                IconButton(
                    onClick = onTogglePlay,
                    modifier = Modifier.size(44.dp),
                ) {
                    when {
                        isLoading -> CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = colors.foreground,
                            strokeWidth = 2.dp,
                        )
                        isPlaying -> Icon(
                            Icons.Default.Pause,
                            contentDescription = "توقف",
                            tint = colors.foreground,
                        )
                        else -> Icon(
                            Icons.Default.PlayArrow,
                            contentDescription = "پخش",
                            tint = colors.foreground,
                        )
                    }
                }
                IconButton(
                    onClick = onNextRecitation,
                    enabled = recitationIndex < recitationCount - 1,
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                        contentDescription = "خوانش بعدی",
                        tint = colors.foreground,
                    )
                }
            }
            Text(
                text = "${currentTimeSec.toPersianTime()} / ${durationSec.toPersianTime()}",
                style = MaterialTheme.typography.labelMedium,
                color = colors.muted,
            )
        }

        LinearProgressIndicator(
            progress = { progress.coerceIn(0f, 1f) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 6.dp),
            color = colors.foreground,
            trackColor = colors.border,
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = recitation.audioArtist.ifBlank { "خوانش" },
                style = MaterialTheme.typography.labelMedium,
                color = colors.muted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = recitation.audioTitle,
                style = MaterialTheme.typography.labelSmall,
                color = colors.muted.copy(alpha = 0.85f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
    }
}
