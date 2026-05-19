package net.ganjoorak.app.ui.search

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import net.ganjoorak.app.data.model.PoemSearchResult
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors

@Composable
fun SearchScreen(
    poemRepository: PoemRepository,
    onBack: () -> Unit,
    onPoemClick: (Int) -> Unit,
    modifier: Modifier = Modifier,
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

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        Text(
            text = "جستجو",
            style = MaterialTheme.typography.headlineMedium,
            color = colors.foreground,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
        )
        OutlinedTextField(
            value = query,
            onValueChange = {
                query = it
                search(it)
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            placeholder = { Text("جستجوی شعر یا شاعر", color = colors.muted) },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = colors.foreground,
                unfocusedTextColor = colors.foreground,
                focusedBorderColor = colors.border,
                unfocusedBorderColor = colors.border,
                cursorColor = colors.foreground,
            ),
        )
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.padding(16.dp),
                color = colors.foreground,
            )
        }
        LazyColumn(modifier = Modifier.weight(1f)) {
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
