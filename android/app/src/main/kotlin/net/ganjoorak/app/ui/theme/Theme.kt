package net.ganjoorak.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.domain.settings.AppTheme
import net.ganjoorak.app.domain.settings.PoemFontFamily

data class GanjoorakColorScheme(
    val background: Color,
    val foreground: Color,
    val card: Color,
    val muted: Color,
    val border: Color,
    val secondary: Color,
    val accent: Color,
    val primary: Color,
    val onPrimary: Color,
)

val LocalGanjoorakColors = staticCompositionLocalOf {
    GanjoorakColorScheme(
        background = GanjoorakColors.DarkBackground,
        foreground = GanjoorakColors.DarkForeground,
        card = GanjoorakColors.DarkCard,
        muted = GanjoorakColors.DarkMuted,
        border = GanjoorakColors.DarkBorder,
        secondary = GanjoorakColors.DarkSecondary,
        accent = GanjoorakColors.DarkSecondary,
        primary = GanjoorakColors.DarkForeground,
        onPrimary = GanjoorakColors.DarkBackground,
    )
}

fun colorSchemeFor(theme: AppTheme): GanjoorakColorScheme = when (theme) {
    AppTheme.DARK -> GanjoorakColorScheme(
        background = GanjoorakColors.DarkBackground,
        foreground = GanjoorakColors.DarkForeground,
        card = GanjoorakColors.DarkCard,
        muted = GanjoorakColors.DarkMuted,
        border = GanjoorakColors.DarkBorder,
        secondary = GanjoorakColors.DarkSecondary,
        accent = GanjoorakColors.DarkSecondary,
        primary = GanjoorakColors.DarkForeground,
        onPrimary = GanjoorakColors.DarkBackground,
    )
    AppTheme.LIGHT -> GanjoorakColorScheme(
        background = GanjoorakColors.LightBackground,
        foreground = GanjoorakColors.LightForeground,
        card = Color.White,
        muted = GanjoorakColors.LightMuted,
        border = GanjoorakColors.LightBorder,
        secondary = GanjoorakColors.LightSecondary,
        accent = GanjoorakColors.LightSecondary,
        primary = Color(0xFF3C3C3C),
        onPrimary = GanjoorakColors.LightBackground,
    )
    AppTheme.PAPER -> GanjoorakColorScheme(
        background = GanjoorakColors.PaperBackground,
        foreground = GanjoorakColors.PaperForeground,
        card = GanjoorakColors.PaperCard,
        muted = GanjoorakColors.PaperMuted,
        border = GanjoorakColors.PaperBorder,
        secondary = GanjoorakColors.PaperSecondary,
        accent = GanjoorakColors.PaperAccent,
        primary = GanjoorakColors.PaperPrimary,
        onPrimary = GanjoorakColors.PaperCard,
    )
}

@Composable
fun GanjoorakTheme(
    theme: AppTheme = AppTheme.DARK,
    fontFamily: PoemFontFamily = PoemFontFamily.VAZIRMATN,
    poemFontSize: Int = 100,
    content: @Composable () -> Unit,
) {
    val ganjoorakColors = colorSchemeFor(theme)
    val poemTypography = poemTypography(fontFamily, poemFontSize)

    val materialScheme = when (theme) {
        AppTheme.LIGHT, AppTheme.PAPER -> lightColorScheme(
            primary = ganjoorakColors.primary,
            onPrimary = ganjoorakColors.onPrimary,
            background = ganjoorakColors.background,
            onBackground = ganjoorakColors.foreground,
            surface = ganjoorakColors.card,
            onSurface = ganjoorakColors.foreground,
        )
        AppTheme.DARK -> darkColorScheme(
            primary = ganjoorakColors.primary,
            onPrimary = ganjoorakColors.onPrimary,
            background = ganjoorakColors.background,
            onBackground = ganjoorakColors.foreground,
            surface = ganjoorakColors.card,
            onSurface = ganjoorakColors.foreground,
        )
    }

    CompositionLocalProvider(
        LocalGanjoorakColors provides ganjoorakColors,
        LocalPoemTypography provides poemTypography,
    ) {
        MaterialTheme(
            colorScheme = materialScheme,
            typography = appTypography(fontFamily),
            content = content,
        )
    }
}
