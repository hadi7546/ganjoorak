package net.ganjoorak.app.ui.poets

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
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
import net.ganjoorak.app.data.model.Century
import net.ganjoorak.app.data.model.PoemSource
import net.ganjoorak.app.data.model.Poet
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors
import net.ganjoorak.app.util.PoetKeys

private const val ALL_FILTER_ID = "all"
private val FALLBACK_FEATURED_SLUGS = listOf(
    "hafez", "saadi", "moulavi", "ferdousi", "khayyam", "attar", "nezami", "sanaee",
)

private data class PoetFilterOption(
    val id: String,
    val label: String,
    val matches: (Poet) -> Boolean,
)

@Composable
fun PoetsScreen(
    poemRepository: PoemRepository,
    onPoetClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var loading by remember { mutableStateOf(true) }
    var centuries by remember { mutableStateOf<List<Century>>(emptyList()) }
    var customPoets by remember { mutableStateOf<List<Poet>>(emptyList()) }
    var modernPoets by remember { mutableStateOf<List<Poet>>(emptyList()) }
    val colors = LocalGanjoorakColors.current

    LaunchedEffect(Unit) {
        loading = true
        runCatching {
            centuries = poemRepository.getCenturies()
            customPoets = poemRepository.getCustomPoets().filter { it.published }
            modernPoets = poemRepository.getEcholaliaPoets().filter { it.published }
        }
        loading = false
    }

    val apiFeaturedCentury = centuries.find { it.id == 0 }
    val otherCenturies = centuries.filter { it.id != 0 }
    val pinnedPoets = otherCenturies
        .flatMap { it.poets }
        .filter { it.published && it.pinOrder > 0 }
        .sortedBy { it.pinOrder }
    val fallbackFeatured = if (pinnedPoets.isNotEmpty()) {
        pinnedPoets
    } else {
        FALLBACK_FEATURED_SLUGS.mapNotNull { slug ->
            otherCenturies.flatMap { it.poets }.find { it.published && it.urlSlug == slug }
        }
    }
    val featuredPoets = apiFeaturedCentury?.poets?.filter { it.published }
        ?.takeIf { it.isNotEmpty() }
        ?: fallbackFeatured

    val modernAll = (customPoets + modernPoets).sortedBy { it.nickname ?: it.name }
    val classicPoets = otherCenturies.flatMap { it.poets }.filter { it.published }
    val classicFilters = otherCenturies
        .filter { century -> century.poets.any { it.published } }
        .map { century ->
            PoetFilterOption(
                id = "century-${century.id}",
                label = century.name,
                matches = { poet ->
                    century.poets.any { it.id == poet.id && it.urlSlug == poet.urlSlug }
                },
            )
        }
    val modernFilters = buildModernFilters(modernAll)

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
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(bottom = 24.dp),
                ) {
                    if (featuredPoets.isNotEmpty()) {
                        PoetsCategorySection(
                            title = "شاعران محبوب",
                            defaultExpanded = true,
                        ) {
                            PoetsGrid(
                                poets = featuredPoets.sortedBy { it.nickname ?: it.name },
                                onPoetClick = onPoetClick,
                            )
                        }
                    }

                    PoetsCategorySection(
                        title = "شاعران نو/جهان",
                        sourceLabel = "اکولالیا",
                    ) {
                        if (modernAll.isEmpty()) {
                            Text(
                                text = "به زودی...",
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.muted,
                                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                            )
                        } else {
                            FilterablePoetsGrid(
                                poets = modernAll,
                                filters = modernFilters,
                                onPoetClick = onPoetClick,
                            )
                        }
                    }

                    PoetsCategorySection(
                        title = "شاعران کهن",
                        sourceLabel = "گنجور",
                    ) {
                        if (classicPoets.isEmpty()) {
                            Text(
                                text = "فهرست شاعران کهن در دسترس نیست.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.muted,
                                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                            )
                        } else {
                            FilterablePoetsGrid(
                                poets = classicPoets.sortedBy { it.nickname ?: it.name },
                                filters = classicFilters,
                                onPoetClick = onPoetClick,
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun buildModernFilters(poets: List<Poet>): List<PoetFilterOption> {
    val groups = linkedMapOf<String, List<Poet>>()
    poets.forEach { poet ->
        val group = when (poet.source) {
            PoemSource.CUSTOM -> "شاعران معاصر"
            else -> poet.sourceGroupName ?: "دیگر شاعران"
        }
        groups[group] = groups.getOrDefault(group, emptyList()) + poet
    }
    return groups.map { (label, grouped) ->
        PoetFilterOption(
            id = label,
            label = label,
            matches = { grouped.contains(it) },
        )
    }
}

@Composable
private fun PoetsCategorySection(
    title: String,
    sourceLabel: String? = null,
    defaultExpanded: Boolean = false,
    content: @Composable () -> Unit,
) {
    var expanded by remember { mutableStateOf(defaultExpanded) }
    val colors = LocalGanjoorakColors.current

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded }
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge,
                    color = colors.foreground,
                )
                if (sourceLabel != null) {
                    Text(
                        text = "منبع: $sourceLabel",
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.muted,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
            Icon(
                imageVector = if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                contentDescription = null,
                tint = colors.muted,
            )
        }
        if (expanded) {
            content()
        }
    }
}

@Composable
private fun FilterablePoetsGrid(
    poets: List<Poet>,
    filters: List<PoetFilterOption>,
    onPoetClick: (String) -> Unit,
) {
    var activeFilter by remember(poets, filters) { mutableStateOf(ALL_FILTER_ID) }
    val colors = LocalGanjoorakColors.current

    val filterButtons = buildList {
        add(Triple(ALL_FILTER_ID, "همه", poets.size))
        filters.forEach { filter ->
            val count = poets.count(filter.matches)
            if (count > 0) add(Triple(filter.id, filter.label, count))
        }
    }.filter { it.third > 0 }

    if (filterButtons.size > 2) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            filterButtons.forEach { (id, label, _) ->
                FilterChip(
                    selected = activeFilter == id,
                    onClick = { activeFilter = id },
                    label = { Text(label) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = colors.secondary,
                        selectedLabelColor = colors.foreground,
                    ),
                )
            }
        }
    }

    val visiblePoets = if (activeFilter == ALL_FILTER_ID) {
        poets
    } else {
        val selected = filters.find { it.id == activeFilter }
        if (selected != null) poets.filter(selected.matches) else poets
    }

    PoetsGrid(poets = visiblePoets, onPoetClick = onPoetClick)
}

@Composable
private fun PoetsGrid(
    poets: List<Poet>,
    onPoetClick: (String) -> Unit,
) {
    val columns = 3
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        poets.chunked(columns).forEach { rowPoets ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                rowPoets.forEach { poet ->
                    PoetGridCard(
                        poet = poet,
                        onClick = { onPoetClick(PoetKeys.key(poet)) },
                        modifier = Modifier.weight(1f),
                    )
                }
                repeat(columns - rowPoets.size) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun PoetGridCard(
    poet: Poet,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalGanjoorakColors.current
    val displayName = poet.nickname ?: poet.name

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(colors.foreground.copy(alpha = 0.08f))
            .clickable(onClick = onClick)
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        AsyncImage(
            model = poet.imageUrl.ifBlank { null },
            contentDescription = displayName,
            modifier = Modifier
                .size(56.dp)
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
    }
}
