package net.ganjoorak.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class GanjoorPoemDto(
    val id: Int = 0,
    val title: String? = null,
    val fullTitle: String? = null,
    val urlSlug: String? = null,
    val fullUrl: String? = null,
    val plainText: String? = null,
    val htmlText: String? = null,
    val recitations: List<GanjoorRecitationDto>? = null,
)

@Serializable
data class GanjoorRecitationDto(
    val id: Int = 0,
    val poemId: Int = 0,
    val poemFullTitle: String? = null,
    val poemFullUrl: String? = null,
    val audioTitle: String? = null,
    val audioArtist: String? = null,
    val audioArtistUrl: String? = null,
    val audioSrc: String? = null,
    val audioSrcUrl: String? = null,
    val legacyAudioGuid: String? = null,
    val mp3FileCheckSum: String? = null,
    val mp3SizeInBytes: Long = 0,
    val publishDate: String? = null,
    val fileLastUpdated: String? = null,
    val mp3Url: String? = null,
    val xmlText: String? = null,
    val plainText: String? = null,
    val htmlText: String? = null,
    val audioOrder: Int = 0,
    val recitationType: Int = 0,
    val inSyncWithText: Boolean = false,
    val upVotedByUser: Boolean = false,
)

@Serializable
data class GanjoorPoetDto(
    val id: Int = 0,
    val name: String = "",
    val description: String? = null,
    val fullUrl: String = "",
    val rootCatId: Int = 0,
    val nickname: String? = null,
    val published: Boolean = false,
    val imageUrl: String? = null,
    val birthYearInLHijri: Int? = null,
    val validBirthDate: Boolean = false,
    val deathYearInLHijri: Int? = null,
    val validDeathDate: Boolean = false,
    val pinOrder: Int = 0,
    val birthPlace: String? = null,
    val birthPlaceLatitude: Double? = null,
    val birthPlaceLongitude: Double? = null,
    val deathPlace: String? = null,
    val deathPlaceLatitude: Double? = null,
    val deathPlaceLongitude: Double? = null,
)

@Serializable
data class GanjoorCenturyDto(
    val id: Int = 0,
    val name: String = "",
    val halfCenturyOrder: Int = 0,
    val startYear: Int = 0,
    val endYear: Int = 0,
    val showInTimeLine: Boolean = false,
    val poets: List<GanjoorPoetDto> = emptyList(),
)

@Serializable
data class VerseSyncDto(
    val verseOrder: Int = 0,
    val verseText: String = "",
    val audioStartMilliseconds: Long = 0,
)

@Serializable
data class GanjoorSearchResultDto(
    val id: Int = 0,
    val title: String = "",
    val fullTitle: String = "",
    val fullUrl: String = "",
    val plainText: String = "",
    val poemSummary: String? = null,
)

@Serializable
data class EcholaliaCategoryDto(
    val id: Int = 0,
    val count: Int = 0,
    val link: String = "",
    val name: String = "",
    val slug: String = "",
    val parent: Int = 0,
    val description: String? = null,
)

@Serializable
data class EcholaliaPostDto(
    val id: Int = 0,
    val date: String = "",
    val slug: String = "",
    val link: String = "",
    val title: EcholaliaRenderedDto = EcholaliaRenderedDto(),
    val content: EcholaliaRenderedDto? = null,
    val excerpt: EcholaliaRenderedDto? = null,
    val categories: List<Int> = emptyList(),
)

@Serializable
data class EcholaliaRenderedDto(
    val rendered: String = "",
)

enum class PoemSource {
    GANJOOR,
    CUSTOM,
    ECHOLALIA,
}

data class PoemRecitation(
    val id: Int,
    val audioTitle: String,
    val audioArtist: String,
    val mp3Url: String,
    val inSyncWithText: Boolean,
)

data class Poem(
    val id: Int,
    val title: String,
    val fullTitle: String,
    val poet: String,
    val poetNickname: String,
    val poetSlug: String,
    val poetImageUrl: String,
    val urlSlug: String,
    val fullUrl: String,
    val plainText: String,
    val recitations: List<PoemRecitation>,
    val source: PoemSource = PoemSource.GANJOOR,
    val isCustom: Boolean = false,
)

data class VerseSync(
    val verseOrder: Int,
    val verseText: String,
    val audioStartMilliseconds: Long,
)

data class Poet(
    val id: Int,
    val name: String,
    val description: String?,
    val fullUrl: String,
    val urlSlug: String,
    val rootCatId: Int,
    val nickname: String?,
    val published: Boolean,
    val imageUrl: String,
    val source: PoemSource,
    val sourceGroupName: String? = null,
)

data class Century(
    val id: Int,
    val name: String,
    val poets: List<Poet>,
)

data class PoemSearchResult(
    val id: Int,
    val title: String,
    val fullTitle: String,
    val fullUrl: String,
    val plainText: String,
    val poetName: String,
    val poetSlug: String,
)
