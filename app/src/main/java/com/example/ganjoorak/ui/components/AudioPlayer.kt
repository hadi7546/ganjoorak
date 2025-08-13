package com.example.ganjoorak.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.example.ganjoorak.data.model.PoemRecitation
import kotlinx.coroutines.delay

@Composable
fun AudioPlayer(
    recitations: List<PoemRecitation>
) {
    val context = LocalContext.current
    var currentRecitationIndex by remember { mutableStateOf(0) }
    var isPlaying by remember { mutableStateOf(false) }
    var currentPosition by remember { mutableStateOf(0L) }
    var totalDuration by remember { mutableStateOf(0L) }

    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(recitations[currentRecitationIndex].mp3Url))
            prepare()
        }
    }

    DisposableEffect(Unit) {
        val listener = object : Player.Listener {
            override fun onIsPlayingChanged(isPlayingValue: Boolean) {
                isPlaying = isPlayingValue
            }

            override fun onEvents(player: Player, events: Player.Events) {
                super.onEvents(player, events)
                totalDuration = player.duration.coerceAtLeast(0L)
            }
        }
        exoPlayer.addListener(listener)

        onDispose {
            exoPlayer.removeListener(listener)
            exoPlayer.release()
        }
    }

    LaunchedEffect(isPlaying) {
        while (isPlaying) {
            currentPosition = exoPlayer.currentPosition
            delay(1000)
        }
    }

    LaunchedEffect(currentRecitationIndex) {
        exoPlayer.setMediaItem(MediaItem.fromUri(recitations[currentRecitationIndex].mp3Url))
        exoPlayer.prepare()
        if (isPlaying) {
            exoPlayer.play()
        }
    }

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = recitations[currentRecitationIndex].audioArtist)
        Slider(
            value = currentPosition.toFloat(),
            onValueChange = { exoPlayer.seekTo(it.toLong()) },
            valueRange = 0f..totalDuration.toFloat()
        )
        Row {
            IconButton(onClick = {
                if (currentRecitationIndex > 0) {
                    currentRecitationIndex--
                }
            }) {
                Icon(Icons.Default.SkipPrevious, contentDescription = "Previous")
            }
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(onClick = {
                if (isPlaying) exoPlayer.pause() else exoPlayer.play()
            }) {
                Icon(
                    if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (isPlaying) "Pause" else "Play"
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(onClick = {
                if (currentRecitationIndex < recitations.size - 1) {
                    currentRecitationIndex++
                }
            }) {
                Icon(Icons.Default.SkipNext, contentDescription = "Next")
            }
        }
    }
}
