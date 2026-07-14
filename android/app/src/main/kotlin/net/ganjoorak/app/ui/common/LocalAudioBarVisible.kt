package net.ganjoorak.app.ui.common

import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.staticCompositionLocalOf

val LocalAudioBarVisible = staticCompositionLocalOf<MutableState<Boolean>> {
    mutableStateOf(false)
}
