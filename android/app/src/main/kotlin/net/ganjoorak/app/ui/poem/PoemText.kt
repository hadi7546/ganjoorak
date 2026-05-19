package net.ganjoorak.app.ui.poem

import android.os.Build
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
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
    onLinePositioned: ((lineOrder: Int, yInRoot: Float) -> Unit)? = null,
) {
    val colors = LocalGanjoorakColors.current
    val lines = plainText.lines().filter { it.isNotBlank() }
    val highlightActive = highlightedVerseOrder > 0

    Column(modifier = modifier.fillMaxWidth()) {
        var globalLineIndex = 0
        val verses = chunkLines(lines, 2)

        verses.forEach { pair ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
            ) {
                pair.forEachIndexed { lineIndexInPair, line ->
                    globalLineIndex++
                    val lineOrder = globalLineIndex
                    val highlighted = highlightActive && highlightedVerseOrder == lineOrder
                    val dimmed = highlightActive && !highlighted

                    val lineNumber = when {
                        pair.size == 2 -> lineOrder * 2 - (1 - lineIndexInPair)
                        else -> lineOrder
                    }

                    Text(
                        text = buildString {
                            if (showLineNumbers) {
                                append(lineNumber.toPersianDigits())
                                append("  ")
                            }
                            append(line.trim())
                        },
                        style = if (pair.size == 2) poemVerseStyle() else poemTextStyle(),
                        color = when {
                            highlighted -> colors.foreground
                            dimmed -> colors.foreground.copy(alpha = 0.38f)
                            else -> colors.foreground.copy(alpha = 0.92f)
                        },
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .graphicsLayer {
                                if (dimmed && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                    renderEffect = androidx.compose.ui.graphics.BlurEffect(
                                        radiusX = 2.5f,
                                        radiusY = 2.5f,
                                    )
                                }
                                alpha = when {
                                    highlighted -> 1f
                                    dimmed -> 0.55f
                                    else -> 1f
                                }
                            }
                            .then(
                                if (highlighted) {
                                    Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                } else {
                                    Modifier
                                },
                            )
                            .onGloballyPositioned { coordinates ->
                                onLinePositioned?.invoke(
                                    lineOrder,
                                    coordinates.positionInRoot().y,
                                )
                            },
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
