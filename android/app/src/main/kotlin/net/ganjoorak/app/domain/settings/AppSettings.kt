package net.ganjoorak.app.domain.settings

import kotlinx.serialization.Serializable

enum class AppTheme { DARK, LIGHT, PAPER }

enum class PoemFontFamily {
    VAZIRMATN,
    SAMIM,
    TANHA,
    SHABNAM,
    GANDOM,
    PARASTOO,
    SAHEL,
    VAZIRCODE,
    NAHID,
}

@Serializable
data class PoemViewerVisibility(
    val titleSection: Boolean = true,
    val titleBreadcrumbs: Boolean = true,
    val audioPlayer: Boolean = true,
    val actionButtons: Boolean = true,
    val navigationControls: Boolean = true,
)

data class AppSettings(
    val theme: AppTheme = AppTheme.DARK,
    val showLineNumbers: Boolean = false,
    val fontFamily: PoemFontFamily = PoemFontFamily.VAZIRMATN,
    val poemFontSize: Int = 100,
    val poemViewerVisibility: PoemViewerVisibility = PoemViewerVisibility(),
    val randomizePoems: Boolean = true,
    val askRandomizePoemsOnPoetPages: Boolean = true,
    val followedPoetKeys: List<String> = emptyList(),
    val zenScrollLock: Boolean = false,
) {
    companion object {
        const val POEM_FONT_SIZE_MIN = 85
        const val POEM_FONT_SIZE_MAX = 125
        const val POEM_FONT_SIZE_STEP = 5

        fun clampFontSize(value: Int): Int {
            val stepped = (value / POEM_FONT_SIZE_STEP) * POEM_FONT_SIZE_STEP
            return stepped.coerceIn(POEM_FONT_SIZE_MIN, POEM_FONT_SIZE_MAX)
        }
    }
}
