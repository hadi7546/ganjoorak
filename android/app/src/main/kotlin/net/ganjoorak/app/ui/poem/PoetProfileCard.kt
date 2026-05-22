package net.ganjoorak.app.ui.poem

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors

@Composable
fun PoetProfileCard(
    poetName: String,
    imageUrl: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
) {
    val colors = LocalGanjoorakColors.current
    val imageSize = if (compact) 48.dp else 56.dp

    Column(
        modifier = modifier
            .widthIn(max = 72.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(colors.secondary.copy(alpha = 0.55f))
            .border(1.dp, colors.border.copy(alpha = 0.35f), RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 6.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        AsyncImage(
            model = imageUrl.ifBlank { null },
            contentDescription = poetName,
            modifier = Modifier
                .size(imageSize)
                .clip(CircleShape)
                .background(colors.border.copy(alpha = 0.35f)),
            contentScale = ContentScale.Crop,
        )
        Text(
            text = poetName,
            style = if (compact) {
                MaterialTheme.typography.labelSmall
            } else {
                MaterialTheme.typography.labelMedium
            },
            color = colors.foreground,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 6.dp),
        )
    }
}
