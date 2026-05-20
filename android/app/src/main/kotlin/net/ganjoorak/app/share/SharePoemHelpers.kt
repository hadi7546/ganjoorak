package net.ganjoorak.app.share

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import androidx.core.content.FileProvider
import net.ganjoorak.app.data.model.Poem
import java.io.File
import java.io.FileOutputStream

fun shareableLinesFrom(poem: Poem): List<String> =
    poem.plainText.lines().map { it.trim() }.filter { it.isNotBlank() }

fun buildPoemUrl(poem: Poem): String =
    if (poem.isCustom) {
        "https://ganjoorak.ir/${poem.poetSlug}/${poem.id}"
    } else {
        "https://ganjoorak.ir/poem/${poem.id}"
    }

fun buildShareText(poem: Poem, lines: List<String>): String =
    buildString {
        append(lines.joinToString("\n"))
        append("\n\n")
        append("${poem.title} - ${poem.poet}")
        append("\n")
        append(buildPoemUrl(poem))
    }

fun copyShareText(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("poem", text))
}

fun shareTextIntent(context: Context, text: String) {
    context.startActivity(
        Intent.createChooser(
            Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, text)
            },
            "اشتراک متن",
        ),
    )
}

fun shareBitmapFile(context: Context, bitmap: Bitmap, poemId: Int) {
    val dir = File(context.cacheDir, "share").apply { mkdirs() }
    val file = File(dir, "ganjoorak-poem-$poemId.png")
    FileOutputStream(file).use { out ->
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
    }
    val uri: Uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "اشتراک تصویر شعر"))
}
