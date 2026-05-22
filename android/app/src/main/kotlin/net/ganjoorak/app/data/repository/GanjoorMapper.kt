package net.ganjoorak.app.data.repository

import net.ganjoorak.app.BuildConfig
import net.ganjoorak.app.data.model.Century
import net.ganjoorak.app.data.model.GanjoorCenturyDto
import net.ganjoorak.app.data.model.GanjoorPoemDto
import net.ganjoorak.app.data.model.GanjoorRecitationDto
import net.ganjoorak.app.data.model.GanjoorSearchResultDto
import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.data.model.PoemRecitation
import net.ganjoorak.app.data.model.PoemSearchResult
import net.ganjoorak.app.data.model.PoemSource
import net.ganjoorak.app.data.model.Poet
import net.ganjoorak.app.data.model.VerseSyncDto

private val baseUrl = BuildConfig.GANJOOR_API_BASE_URL.trimEnd('/')

fun resolveAudioUrl(url: String?): String {
    if (url.isNullOrBlank()) return ""
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    return url
}

fun getPoetSlug(fullUrl: String): String {
    val clean = fullUrl.trimStart('/')
    return clean.split('/').firstOrNull().orEmpty()
}

fun getPoetName(fullTitle: String): String =
    fullTitle.split(" » ").firstOrNull()?.trim().orEmpty()

fun GanjoorPoemDto.toPoem(): Poem {
    if (id < 1) error("متأسفانه شعر مورد نظر یافت نشد")

    val slug = getPoetSlug(fullUrl.orEmpty())
    val cleanHtml = htmlText
        ?.replace(Regex("<div[^>]*>"), "")
        ?.replace("</motion.div>", "")
        ?.replace("</div>", "")
        ?.replace(Regex("<p[^>]*>"), "")
        ?.replace("</p>", "\n")
        ?.trim()
        .orEmpty()

    val text = cleanHtml.ifBlank { plainText.orEmpty() }
    val recitationList = recitations.orEmpty().map { it.toRecitation() }

    return Poem(
        id = id,
        title = title.orEmpty().ifBlank { "بدون عنوان" },
        fullTitle = fullTitle.orEmpty(),
        urlSlug = urlSlug.orEmpty(),
        fullUrl = fullUrl.orEmpty(),
        plainText = text,
        recitations = recitationList,
        poet = getPoetName(fullTitle.orEmpty()),
        poetSlug = slug,
        poetNickname = getPoetName(fullTitle.orEmpty()),
        poetImageUrl = "$baseUrl/api/ganjoor/poet/image/$slug.gif",
        source = PoemSource.GANJOOR,
    )
}

private fun GanjoorRecitationDto.toRecitation(): PoemRecitation {
    val url = resolveAudioUrl(mp3Url ?: audioSrc ?: audioSrcUrl)
    return PoemRecitation(
        id = id,
        audioTitle = audioTitle.orEmpty(),
        audioArtist = audioArtist.orEmpty(),
        mp3Url = url,
        inSyncWithText = inSyncWithText,
    )
}

fun GanjoorSearchResultDto.toSearchResult(): PoemSearchResult {
    val parts = fullTitle.split(" » ").map { it.trim() }.filter { it.isNotEmpty() }
    return PoemSearchResult(
        id = id,
        title = title,
        fullTitle = fullTitle,
        fullUrl = fullUrl,
        plainText = plainText,
        poetName = parts.firstOrNull().orEmpty(),
        poetSlug = getPoetSlug(fullUrl),
    )
}

fun List<VerseSyncDto>.toVerseSync() = map {
    net.ganjoorak.app.data.model.VerseSync(
        verseOrder = it.verseOrder,
        verseText = it.verseText,
        audioStartMilliseconds = it.audioStartMilliseconds,
    )
}

fun net.ganjoorak.app.data.model.GanjoorPoetDto.toPoet(): Poet {
    val slug = fullUrl.trimStart('/')
    return Poet(
        id = id,
        name = name,
        description = description,
        fullUrl = fullUrl,
        urlSlug = slug,
        rootCatId = rootCatId,
        nickname = nickname,
        published = published,
        imageUrl = "$baseUrl/api/ganjoor/poet/image/$slug.gif",
        source = PoemSource.GANJOOR,
        sourceGroupName = "شاعران کهن",
        pinOrder = pinOrder,
    )
}

fun GanjoorCenturyDto.toCentury(): Century = Century(
    id = id,
    name = name,
    poets = poets.map { it.toPoet() },
)
