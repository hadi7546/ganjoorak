package net.ganjoorak.app.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import net.ganjoorak.app.R
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.domain.settings.PoemFontFamily
import androidx.compose.material3.Typography as M3Typography

data class PoemTypography(
    val textSize: Float,
    val verseSize: Float,
    val titleSize: Float,
    val fontFamily: FontFamily,
)

val LocalPoemTypography = staticCompositionLocalOf {
    PoemTypography(19f, 24f, 40f, FontFamily.Default)
}

private val defaultPoemFont by lazy { FontFamily(Font(R.font.vazirmatn)) }

fun fontFamilyFor(option: PoemFontFamily): FontFamily = runCatching {
    when (option) {
        PoemFontFamily.VAZIRMATN -> FontFamily(Font(R.font.vazirmatn))
        PoemFontFamily.SAMIM -> FontFamily(Font(R.font.samim))
        PoemFontFamily.SHABNAM -> FontFamily(Font(R.font.shabnam))
        PoemFontFamily.GANDOM -> FontFamily(Font(R.font.gandom))
        else -> defaultPoemFont
    }
}.getOrElse { FontFamily.SansSerif }

fun poemTypography(fontFamily: PoemFontFamily, poemFontSize: Int): PoemTypography {
    val scale = AppSettings.clampFontSize(poemFontSize) / 100f
    fun clamp(value: Float, min: Float, max: Float) = (value * scale).coerceIn(min, max)
    val family = fontFamilyFor(fontFamily)
    return PoemTypography(
        textSize = clamp(19.2f, 16.8f, 24f),
        verseSize = clamp(24f, 20.8f, 29.6f),
        titleSize = clamp(40f, 34.4f, 49.6f),
        fontFamily = family,
    )
}

fun appTypography(fontFamily: PoemFontFamily): M3Typography {
    val family = fontFamilyFor(fontFamily)
    return M3Typography(
        bodyLarge = TextStyle(fontFamily = family, fontWeight = FontWeight.Normal, fontSize = 16.sp),
        titleLarge = TextStyle(fontFamily = family, fontWeight = FontWeight.Bold, fontSize = 22.sp),
        labelLarge = TextStyle(fontFamily = family, fontWeight = FontWeight.Medium, fontSize = 14.sp),
    )
}

@Composable
fun poemTextStyle(): TextStyle {
    val poem = LocalPoemTypography.current
    return TextStyle(
        fontFamily = poem.fontFamily,
        fontSize = poem.textSize.sp,
        lineHeight = (poem.textSize * 1.8f).sp,
    )
}

@Composable
fun poemVerseStyle(): TextStyle {
    val poem = LocalPoemTypography.current
    return TextStyle(
        fontFamily = poem.fontFamily,
        fontSize = poem.verseSize.sp,
        lineHeight = (poem.verseSize * 1.75f).sp,
    )
}

@Composable
fun poemTitleStyle(): TextStyle {
    val poem = LocalPoemTypography.current
    return TextStyle(
        fontFamily = poem.fontFamily,
        fontSize = poem.titleSize.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = (poem.titleSize * 1.3f).sp,
    )
}
