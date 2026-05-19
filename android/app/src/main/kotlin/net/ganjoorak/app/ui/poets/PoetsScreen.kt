package net.ganjoorak.app.ui.poets

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import net.ganjoorak.app.data.model.PoemSource
import net.ganjoorak.app.data.model.Poet
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PoetsScreen(
    poemRepository: PoemRepository,
    onBack: () -> Unit,
    onPoemClick: (Int) -> Unit,
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
            poets = (ganjoor + custom + echolalia).sortedBy { it.nickname ?: it.name }
        }
        loading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("شاعران") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "بازگشت")
                    }
                },
            )
        },
    ) { padding ->
        when {
            loading -> CircularProgressIndicator(Modifier.padding(padding).padding(24.dp))
            else -> LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
            ) {
                items(poets, key = { "${it.source}-${it.id}" }) { poet ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                // Open random poem from poet - navigate via search/random in future
                            }
                            .padding(horizontal = 20.dp, vertical = 12.dp),
                    ) {
                        Text(
                            text = poet.nickname ?: poet.name,
                            style = MaterialTheme.typography.titleMedium,
                            color = colors.foreground,
                        )
                        Text(
                            text = when (poet.source) {
                                PoemSource.GANJOOR -> "گنجور"
                                PoemSource.ECHOLALIA -> "اکولالیا"
                                PoemSource.CUSTOM -> "شاعران محلی"
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.muted,
                        )
                    }
                }
            }
        }
    }
}
