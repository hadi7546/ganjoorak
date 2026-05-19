package net.ganjoorak.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class CustomPoetBundleDto(
    val poet: String = "",
    val poetSlug: String = "",
    val imageUrl: String? = null,
    val poems: List<CustomPoemDto> = emptyList(),
)

@Serializable
data class CustomPoemDto(
    val id: Int = 0,
    val title: String = "",
    val text: String = "",
    val source: String? = null,
)
