package net.ganjoorak.app.ui.search

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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import net.ganjoorak.app.data.model.PoemSearchResult
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    poemRepository: PoemRepository,
    onBack: () -> Unit,
    onPoemClick: (Int) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<PoemSearchResult>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    var searchJob by remember { mutableStateOf<Job?>(null) }
    val colors = LocalGanjoorakColors.current

    fun search(term: String) {
        searchJob?.cancel()
        if (term.trim().length < 2) {
            results = emptyList()
            return
        }
        searchJob = scope.launch {
            loading = true
            delay(300)
            results = runCatching { poemRepository.searchPoems(term) }.getOrDefault(emptyList())
            loading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("جستجو") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "بازگشت")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            OutlinedTextField(
                value = query,
                onValueChange = {
                    query = it
                    search(it)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                placeholder = { Text("جستجوی شعر یا شاعر") },
                singleLine = true,
            )
            if (loading) {
                CircularProgressIndicator(Modifier.padding(16.dp))
            }
            LazyColumn {
                items(results, key = { it.id }) { result ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onPoemClick(result.id) }
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                    ) {
                        Text(
                            text = result.title,
                            style = MaterialTheme.typography.titleMedium,
                            color = colors.foreground,
                        )
                        Text(
                            text = result.fullTitle,
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.muted,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }
    }
}
