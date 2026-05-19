package net.ganjoorak.app.audio

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import net.ganjoorak.app.data.model.PoemRecitation
import net.ganjoorak.app.data.model.VerseSync

class PoemAudioPlayer(context: Context) {
    private val player = ExoPlayer.Builder(context).build()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _currentTimeSec = MutableStateFlow(0f)
    val currentTimeSec: StateFlow<Float> = _currentTimeSec.asStateFlow()

    private val _durationSec = MutableStateFlow(0f)
    val durationSec: StateFlow<Float> = _durationSec.asStateFlow()

    private val _highlightedVerse = MutableStateFlow(-1)
    val highlightedVerse: StateFlow<Int> = _highlightedVerse.asStateFlow()

    private var verseSync: List<VerseSync> = emptyList()

    init {
        player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                _isPlaying.value = isPlaying
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                _isLoading.value = playbackState == Player.STATE_BUFFERING
                if (playbackState == Player.STATE_READY) {
                    _durationSec.value = player.duration.coerceAtLeast(0) / 1000f
                }
            }
        })
    }

    fun setVerseSync(sync: List<VerseSync>) {
        verseSync = sync
        updateHighlight()
    }

    fun play(recitation: PoemRecitation) {
        if (recitation.mp3Url.isBlank()) return
        player.setMediaItem(MediaItem.fromUri(recitation.mp3Url))
        player.prepare()
        player.play()
    }

    fun toggle() {
        if (player.isPlaying) player.pause() else player.play()
    }

    fun pause() {
        player.pause()
    }

    fun seekTo(ratio: Float) {
        val duration = player.duration
        if (duration > 0) {
            player.seekTo((duration * ratio).toLong())
        }
    }

    fun nextRecitation(recitations: List<PoemRecitation>, currentIndex: Int) {
        if (currentIndex < recitations.lastIndex) {
            play(recitations[currentIndex + 1])
        }
    }

    fun previousRecitation(recitations: List<PoemRecitation>, currentIndex: Int) {
        if (currentIndex > 0) {
            play(recitations[currentIndex - 1])
        }
    }

    fun tick() {
        _currentTimeSec.value = player.currentPosition / 1000f
        updateHighlight()
    }

    private fun updateHighlight() {
        if (!_isPlaying.value || verseSync.isEmpty()) {
            _highlightedVerse.value = -1
            return
        }
        val currentMs = (player.currentPosition).toLong()
        var order = -1
        if (currentMs <= 2000) {
            order = 1
        } else {
            for (i in verseSync.indices) {
                val verse = verseSync[i]
                val next = verseSync.getOrNull(i + 1)
                if (currentMs >= verse.audioStartMilliseconds &&
                    (next == null || currentMs < next.audioStartMilliseconds)
                ) {
                    order = verse.verseOrder
                    break
                }
            }
        }
        if (order == -1) {
            order = verseSync.firstOrNull { it.verseOrder == 1 }?.verseOrder
                ?: verseSync.firstOrNull()?.verseOrder
                ?: -1
        }
        _highlightedVerse.value = order
    }

    fun release() {
        player.release()
    }
}
