package net.ganjoorak.app.ui.poets

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import net.ganjoorak.app.data.model.PoemSource
import net.ganjoorak.app.data.model.Poet
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors

@Composable
fun PoetsScreen(
    poemRepository: PoemRepository,
    modifier: Modifier = Modifier,
) {
    var poets by remember { mutableStateOf<List<Poet>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    val colors = LocalGanjoorakColors.current

    LaunchedEffect(Unit) {
        loading = true
        runCatching {
            val ganjoor = poemRepository.getPoets()
            val custom = poemRepository.getCustomPoets()
            val echolalia = poemRepository.getEcholaliaPoets()
            poets = (ganjoor + custom + echolalia)
                .filter { it.published }
                .sortedBy { it.nickname ?: it.name }
        }
        loading = false
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        Text(
            text = "شاعران",
            style = MaterialTheme.typography.headlineMedium,
            color = colors.foreground,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            textAlign = TextAlign.Center,
        )

        when {
            loading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = colors.foreground)
                }
            }
            else -> {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 108.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(poets, key = { "${it.source}-${it.id}" }) { poet ->
                        PoetGridCard(poet = poet)
                    }
                }
            }
        }
    }
}

@Composable
private fun PoetGridCard(poet: Poet) {
    val colors = LocalGanjoorakColors.current
    val displayName = poet.nickname ?: poet.name
    val sourceLabel = when (poet.source) {
        PoemSource.GANJOOR -> "گنجور"
        PoemSource.ECHOLALIA -> "اکولالیا"
        PoemSource.CUSTOM -> "محلی"
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(colors.foreground.copy(alpha = 0.08f))
            .clickable { }
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        AsyncImage(
            model = poet.imageUrl.ifBlank { null },
            contentDescription = displayName,
            modifier = Modifier
                .size(60.dp)
                .clip(CircleShape)
                .background(colors.border.copy(alpha = 0.35f)),
            contentScale = ContentScale.Crop,
        )
        Text(
            text = displayName,
            style = MaterialTheme.typography.titleSmall,
            color = colors.foreground,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 8.dp),
        )
        if (poet.name != displayName) {
            Text(
                text = poet.name,
                style = MaterialTheme.typography.bodySmall,
                color = colors.muted,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Text(
            text = sourceLabel,
            style = MaterialTheme.typography.labelSmall,
            color = colors.muted,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}
