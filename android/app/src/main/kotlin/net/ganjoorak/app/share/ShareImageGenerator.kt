package net.ganjoorak.app.share

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import androidx.annotation.FontRes
import androidx.core.content.res.ResourcesCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import net.ganjoorak.app.R
import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.domain.settings.PoemFontFamily
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.max
import kotlin.math.min

enum class ShareThemeId { NIGHT, PAPER, INK }

enum class ShareImageLayout { SINGLE, COUPLET }

data class ShareTheme(
    val id: ShareThemeId,
    val label: String,
    val background: Int,
    val accent: Int,
    val titleColor: Int,
    val textColor: Int,
    val mutedColor: Int,
    val borderColor: Int,
    val brandColor: Int,
)

val SHARE_THEMES = listOf(
    ShareTheme(
        id = ShareThemeId.NIGHT,
        label = "شب",
        background = 0xFF111111.toInt(),
        accent = 0x1FFFFFFF,
        titleColor = 0xEBFFFFFF.toInt(),
        textColor = 0xE6FFFFFF.toInt(),
        mutedColor = 0x9EFFFFFF.toInt(),
        borderColor = 0x29FFFFFF,
        brandColor = 0x85FFFFFF.toInt(),
    ),
    ShareTheme(
        id = ShareThemeId.PAPER,
        label = "کاغذ",
        background = 0xFFF4EAD7.toInt(),
        accent = 0x1E734E26.toInt(),
        titleColor = 0xFF3D2B1F.toInt(),
        textColor = 0xFF493527.toInt(),
        mutedColor = 0xAD3D2B1F.toInt(),
        borderColor = 0x2E3D2B1F.toInt(),
        brandColor = 0x8A3D2B1F.toInt(),
    ),
    ShareTheme(
        id = ShareThemeId.INK,
        label = "مرکب",
        background = 0xFFF7F7F4.toInt(),
        accent = 0x1414181C.toInt(),
        titleColor = 0xFF17191D.toInt(),
        textColor = 0xFF202329.toInt(),
        mutedColor = 0x9E17191D.toInt(),
        borderColor = 0x2917191D.toInt(),
        brandColor = 0x8017191D.toInt(),
    ),
)

object ShareImageGenerator {
    private const val WIDTH = 1080
    private const val HEIGHT = 1350

    suspend fun generate(
        context: Context,
        poem: Poem,
        lines: List<String>,
        theme: ShareTheme,
        fontFamily: PoemFontFamily,
        layout: ShareImageLayout,
    ): Bitmap = withContext(Dispatchers.Default) {
        val poemTypeface = typefaceFor(context, fontFamily)
        val poetBitmap = loadPoetBitmap(poem.poetImageUrl)

        val bitmap = Bitmap.createBitmap(WIDTH, HEIGHT, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        canvas.drawColor(theme.background)

        val gradientPaint = Paint().apply {
            shader = android.graphics.LinearGradient(
                0f,
                0f,
                WIDTH.toFloat(),
                HEIGHT.toFloat(),
                intArrayOf(theme.accent, 0x05FFFFFF, theme.accent),
                floatArrayOf(0f, 0.45f, 1f),
                android.graphics.Shader.TileMode.CLAMP,
            )
        }
        canvas.drawRect(0f, 0f, WIDTH.toFloat(), HEIGHT.toFloat(), gradientPaint)

        val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = theme.borderColor
            style = Paint.Style.STROKE
            strokeWidth = 2f
        }
        canvas.drawRect(56f, 56f, WIDTH - 56f, HEIGHT - 56f, borderPaint)

        val titlePaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = theme.titleColor
            textSize = 50f
            typeface = Typeface.create(poemTypeface, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        val mutedPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = theme.mutedColor
            textSize = 31f
            typeface = poemTypeface
            textAlign = Paint.Align.CENTER
        }
        val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = theme.textColor
            typeface = poemTypeface
            textAlign = Paint.Align.CENTER
        }

        var titleBottom = 160f
        val titleLines = wrapText(titlePaint, poem.title, WIDTH - 210).take(2)
        titleLines.forEachIndexed { index, line ->
            canvas.drawText(line, WIDTH / 2f, titleBottom + index * 62f, titlePaint)
        }
        titleBottom += (titleLines.size - 1) * 62f

        val poetNameY = 215f + (titleLines.size - 1) * 62f
        val poetImageSize = 96f
        val poetImageLeft = WIDTH / 2f - poetImageSize / 2f - 120f
        val poetImageTop = poetNameY - poetImageSize - 8f

        if (poetBitmap != null) {
            drawCircularImage(canvas, poetBitmap, poetImageLeft, poetImageTop, poetImageSize)
            poetBitmap.recycle()
        }

        canvas.drawText(poem.poet.ifBlank { poem.poetNickname }, WIDTH / 2f, poetNameY, mutedPaint)

        val textTop = 340f
        val textBottom = HEIGHT - 185f
        val maxTextHeight = textBottom - textTop

        if (layout == ShareImageLayout.COUPLET) {
            drawCoupletLayout(canvas, lines, textPaint, WIDTH, textTop, maxTextHeight)
        } else {
            drawSingleLayout(canvas, lines, textPaint, WIDTH, textTop, maxTextHeight)
        }

        val brandPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = theme.brandColor
            textSize = 26f
            typeface = poemTypeface
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText("ganjoorak.ir", WIDTH / 2f, HEIGHT - 120f, brandPaint)

        bitmap
    }

    private fun drawCircularImage(
        canvas: Canvas,
        source: Bitmap,
        left: Float,
        top: Float,
        size: Float,
    ) {
        val scaled = Bitmap.createScaledBitmap(source, size.toInt(), size.toInt(), true)
        val save = canvas.save()
        val path = Path().apply {
            addOval(RectF(left, top, left + size, top + size), Path.Direction.CW)
        }
        canvas.clipPath(path)
        canvas.drawBitmap(scaled, left, top, null)
        canvas.restoreToCount(save)
        if (scaled != source) scaled.recycle()
    }

    private fun drawSingleLayout(
        canvas: Canvas,
        lines: List<String>,
        textPaint: TextPaint,
        width: Int,
        textTop: Float,
        maxHeight: Float,
    ) {
        val maxWidth = width - 210
        var fontSize = 42f
        var rendered: List<String> = emptyList()
        var lineHeight = 0f

        while (fontSize >= 24f) {
            textPaint.textSize = fontSize
            rendered = lines.flatMap { wrapText(textPaint, it, maxWidth) }
            lineHeight = fontSize * 1.75f
            if (rendered.size * lineHeight <= maxHeight) break
            fontSize -= 2f
        }

        if (rendered.size * lineHeight > maxHeight) {
            textPaint.textSize = 24f
            lineHeight = 24f * 1.75f
            val maxLines = max(1, (maxHeight / lineHeight).toInt())
            rendered = lines
                .flatMap { wrapText(textPaint, it, maxWidth) }
                .take(maxLines)
                .toMutableList()
            if (rendered.isNotEmpty()) {
                val last = rendered.last()
                rendered[rendered.lastIndex] = last.trimEnd() + "…"
            }
        }

        textPaint.textSize = fontSize
        var y = max(textTop, HEIGHT / 2f - rendered.size * lineHeight / 2f)
        rendered.forEach { line ->
            canvas.drawText(line, width / 2f, y, textPaint)
            y += lineHeight
        }
    }

    private fun drawCoupletLayout(
        canvas: Canvas,
        lines: List<String>,
        textPaint: TextPaint,
        width: Int,
        textTop: Float,
        maxHeight: Float,
    ) {
        val maxWidth = width - 210
        val columnGap = 48f
        val columnWidth = (maxWidth - columnGap) / 2f
        val pairs = lines.chunked(2)

        data class Row(
            val rightLines: List<String>,
            val leftLines: List<String>,
            val lineCount: Int,
            val height: Float,
        )

        fun buildRows(size: Float): Triple<List<Row>, Float, Float> {
            textPaint.textSize = size
            val lineHeight = size * 1.62f
            val pairGap = lineHeight * 0.52f
            val rows = pairs.map { pair ->
                val right = pair.getOrNull(0).orEmpty()
                val left = pair.getOrNull(1).orEmpty()
                val rightLines = if (right.isNotBlank()) wrapText(textPaint, right, columnWidth.toInt()) else emptyList()
                val leftLines = if (left.isNotBlank()) wrapText(textPaint, left, columnWidth.toInt()) else emptyList()
                val lineCount = max(max(rightLines.size, leftLines.size), 1)
                Row(rightLines, leftLines, lineCount, lineCount * lineHeight)
            }
            val total = rows.sumOf { it.height.toDouble() }.toFloat() +
                max(0, rows.size - 1) * pairGap
            return Triple(rows, total, pairGap)
        }

        var fontSize = 38f
        var built = buildRows(fontSize)
        while (fontSize >= 22f && built.second > maxHeight) {
            fontSize -= 2f
            built = buildRows(fontSize)
        }

        val rows = built.first
        val totalHeight = built.second
        val pairGap = built.third
        val lineHeight = fontSize * 1.62f

        val rightColumnX = width / 2f + columnGap / 2f + columnWidth / 2f
        val leftColumnX = width / 2f - columnGap / 2f - columnWidth / 2f
        var y = max(textTop, HEIGHT / 2f - totalHeight / 2f)

        rows.forEach { row ->
            for (index in 0 until row.lineCount) {
                val lineY = y + index * lineHeight
                row.rightLines.getOrNull(index)?.let { canvas.drawText(it, rightColumnX, lineY, textPaint) }
                row.leftLines.getOrNull(index)?.let { canvas.drawText(it, leftColumnX, lineY, textPaint) }
            }
            y += row.height + pairGap
        }
    }

    private fun wrapText(paint: TextPaint, text: String, maxWidth: Int): List<String> {
        if (text.isBlank()) return emptyList()
        val layout = StaticLayout.Builder
            .obtain(text, 0, text.length, paint, maxWidth)
            .setAlignment(Layout.Alignment.ALIGN_NORMAL)
            .setLineSpacing(0f, 1f)
            .setIncludePad(false)
            .build()
        return (0 until layout.lineCount).map { index ->
            text.substring(layout.getLineStart(index), layout.getLineEnd(index)).trim()
        }.filter { it.isNotBlank() }
    }

    private fun loadPoetBitmap(imageUrl: String): Bitmap? {
        if (imageUrl.isBlank()) return null
        return runCatching {
            val connection = (URL(imageUrl).openConnection() as HttpURLConnection).apply {
                connectTimeout = 8_000
                readTimeout = 8_000
            }
            connection.inputStream.use { stream ->
                BitmapFactory.decodeStream(stream)
            }
        }.getOrNull()
    }

    @FontRes
    private fun fontResFor(family: PoemFontFamily): Int = when (family) {
        PoemFontFamily.SAMIM -> R.font.samim
        PoemFontFamily.SHABNAM -> R.font.shabnam
        PoemFontFamily.GANDOM -> R.font.gandom
        else -> R.font.vazirmatn
    }

    private fun typefaceFor(context: Context, family: PoemFontFamily): Typeface {
        return ResourcesCompat.getFont(context, fontResFor(family)) ?: Typeface.DEFAULT
    }
}
