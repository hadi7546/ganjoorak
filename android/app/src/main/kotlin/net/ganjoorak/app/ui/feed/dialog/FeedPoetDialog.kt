package net.ganjoorak.app.ui.feed.dialog

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import net.ganjoorak.app.data.model.Poet
import net.ganjoorak.app.util.PoetKeys

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FeedPoetDialog(
    poets: List<Poet>,
    selectedKeys: List<String>,
    onSave: (List<String>) -> Unit,
    onDismiss: () -> Unit,
) {
    var pending by remember(selectedKeys) { mutableStateOf(selectedKeys.toSet()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("شاعران صفحه اصلی") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
            ) {
                Text(
                    text = "${pending.size} شاعر انتخاب شده",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    poets.forEach { poet ->
                        val key = PoetKeys.key(poet)
                        val label = poet.nickname ?: poet.name
                        FilterChip(
                            selected = key in pending,
                            onClick = {
                                pending = if (key in pending) pending - key else pending + key
                            },
                            label = { Text(label) },
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(pending.toList()) },
                enabled = pending.isNotEmpty(),
            ) {
                Text("شروع")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("بستن") }
        },
    )
}
