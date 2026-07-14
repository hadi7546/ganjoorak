package net.ganjoorak.app.ui.poem

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors

@Composable
fun FloatingCircleButton(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    active: Boolean = false,
) {
    val colors = LocalGanjoorakColors.current
    val background = if (active) {
        colors.accent.copy(alpha = 0.86f)
    } else {
        Color.White.copy(alpha = 0.10f)
    }

    Box(
        modifier = modifier
            .size(40.dp)
            .shadow(6.dp, CircleShape, clip = false)
            .clip(CircleShape)
            .background(background)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = if (active) colors.onPrimary else colors.foreground,
            modifier = Modifier.size(16.dp),
        )
    }
}
