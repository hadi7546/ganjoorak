package net.ganjoorak.app.ui.poem

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors
import net.ganjoorak.app.ui.theme.poemTextStyle
import net.ganjoorak.app.ui.theme.poemVerseStyle
import net.ganjoorak.app.util.toPersianDigits

@Composable
fun PoemTextContent(
    plainText: String,
    showLineNumbers: Boolean,
    highlightedVerseOrder: Int,
    modifier: Modifier = Modifier,
) {
    val colors = LocalGanjoorakColors.current
    val lines = plainText.lines().filter { it.isNotBlank() }
    val verses = chunkLines(lines, 2)

    Column(modifier = modifier.fillMaxWidth()) {
        verses.forEachIndexed { index, pair ->
            val verseOrder = index + 1
            val highlighted = highlightedVerseOrder == verseOrder
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
            ) {
                pair.forEachIndexed { lineIndex, line ->
                    val lineNumber = verseOrder * 2 - (if (pair.size == 2) 1 - lineIndex else 0)
                    Text(
                        text = buildString {
                            if (showLineNumbers) {
                                append(lineNumber.toPersianDigits())
                                append("  ")
                            }
                            append(line.trim())
                        },
                        style = if (pair.size == 2) poemVerseStyle() else poemTextStyle(),
                        color = if (highlighted) colors.foreground else colors.foreground.copy(alpha = 0.92f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .then(
                                if (highlighted) {
                                    Modifier.padding(horizontal = 8.dp)
                                } else {
                                    Modifier
                                },
                            ),
                    )
                }
            }
        }
    }
}

private fun chunkLines(lines: List<String>, size: Int): List<List<String>> {
    if (lines.isEmpty()) return emptyList()
    return lines.chunked(size)
}
