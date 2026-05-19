package net.ganjoorak.app.util

import android.content.Context
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class PoetIndexFile(
    @SerialName("sourcesBySlug") val sourcesBySlug: Map<String, PoetIndexEntry> = emptyMap(),
)

@Serializable
data class PoetIndexEntry(
    val source: String = "ganjoor",
    val id: Int? = null,
)

object PoetIndex {
    private var ganjoorIds: Map<String, Int> = emptyMap()

    fun load(context: Context, json: Json) {
        if (ganjoorIds.isNotEmpty()) return
        runCatching {
            context.assets.open("poet-source-index.json").use { stream ->
                val file = json.decodeFromString<PoetIndexFile>(stream.readBytes().decodeToString())
                ganjoorIds = file.sourcesBySlug
                    .mapNotNull { (slug, entry) ->
                        if (entry.source == "ganjoor" && entry.id != null) slug to entry.id else null
                    }
                    .toMap()
            }
        }
    }

    fun ganjoorPoetId(slug: String): Int? = ganjoorIds[slug]
}
