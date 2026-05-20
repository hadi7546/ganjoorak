package net.ganjoorak.app.ui.poem

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInParent
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
    onLinePositioned: ((lineOrder: Int, yInParent: Float) -> Unit)? = null,
    shareSelectMode: Boolean = false,
    selectedLineIndices: Set<Int> = emptySet(),
    onShareLineToggle: ((lineIndex: Int) -> Unit)? = null,
) {
    val colors = LocalGanjoorakColors.current
    val lines = plainText.lines().filter { it.isNotBlank() }
    val highlightActive = highlightedVerseOrder > 0 && !shareSelectMode

    Column(modifier = modifier.fillMaxWidth()) {
        var globalLineIndex = 0
        val verses = chunkLines(lines, 2)

        verses.forEach { pair ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = if (shareSelectMode) 2.dp else 6.dp),
            ) {
                pair.forEachIndexed { lineIndexInPair, line ->
                    globalLineIndex++
                    val lineOrder = globalLineIndex
                    val shareLineIndex = lineOrder - 1
                    val highlighted = highlightActive && highlightedVerseOrder == lineOrder
                    val dimmed = highlightActive && !highlighted
                    val shareSelected = shareSelectMode && shareLineIndex in selectedLineIndices
                    val shareDimmed = shareSelectMode && !shareSelected

                    val lineNumber = when {
                        pair.size == 2 -> lineOrder * 2 - (1 - lineIndexInPair)
                        else -> lineOrder
                    }

                    val textColor = when {
                        shareSelected -> colors.foreground
                        shareDimmed -> colors.foreground.copy(alpha = 0.35f)
                        highlighted -> colors.foreground
                        dimmed -> colors.foreground.copy(alpha = 0.38f)
                        else -> colors.foreground.copy(alpha = 0.92f)
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
                        color = textColor,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .then(
                                if (shareSelectMode) {
                                    Modifier
                                        .background(
                                            if (shareSelected) {
                                                colors.accent.copy(alpha = 0.55f)
                                            } else {
                                                colors.background
                                            },
                                        )
                                        .clickable { onShareLineToggle?.invoke(shareLineIndex) }
                                        .padding(horizontal = 10.dp, vertical = 8.dp)
                                } else {
                                    Modifier.graphicsLayer {
                                        alpha = when {
                                            highlighted -> 1f
                                            dimmed -> 0.42f
                                            else -> 1f
                                        }
                                    }.then(
                                        if (highlighted) {
                                            Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                        } else {
                                            Modifier
                                        },
                                    )
                                },
                            )
                            .onGloballyPositioned { coordinates ->
                                onLinePositioned?.invoke(
                                    lineOrder,
                                    coordinates.positionInParent().y,
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
