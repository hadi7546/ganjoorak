package net.ganjoorak.app.util

object HtmlUtils {
    fun decode(value: String): String {
        return value
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&nbsp;", " ")
            .replace(Regex("&#(\\d+);")) { match ->
                match.groupValues.getOrNull(1)?.toIntOrNull()?.toChar()?.toString() ?: match.value
            }
    }

    fun stripHtml(html: String): String =
        decode(html.replace(Regex("<[^>]+>"), "\n"))
            .lines()
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .joinToString("\n")
}
