package net.ganjoorak.app.util

import net.ganjoorak.app.data.model.PoemSource
import net.ganjoorak.app.data.model.Poet

data class ParsedPoetKey(val source: PoemSource, val slug: String)

object PoetKeys {

    fun key(poet: Poet): String {
        val source = when (poet.source) {
            PoemSource.GANJOOR -> "ganjoor"
            PoemSource.CUSTOM -> "custom"
            PoemSource.ECHOLALIA -> "echolalia"
        }
        return "$source:${poet.urlSlug}"
    }

    fun parse(key: String): ParsedPoetKey {
        val separator = key.indexOf(':')
        val sourceName = if (separator >= 0) key.substring(0, separator) else "ganjoor"
        val slug = if (separator >= 0) key.substring(separator + 1) else key
        val source = when (sourceName) {
            "custom" -> PoemSource.CUSTOM
            "echolalia" -> PoemSource.ECHOLALIA
            else -> PoemSource.GANJOOR
        }
        return ParsedPoetKey(source, slug)
    }

    fun ganjoorPoetId(slug: String): Int? = PoetIndex.ganjoorPoetId(slug)
}
