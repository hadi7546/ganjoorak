package net.ganjoorak.app.data.repository

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import net.ganjoorak.app.data.api.EcholaliaApi
import net.ganjoorak.app.data.api.GanjoorApi
import net.ganjoorak.app.data.model.CustomPoetBundleDto
import net.ganjoorak.app.data.model.EcholaliaPostDto
import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.data.model.PoemSearchResult
import net.ganjoorak.app.data.model.PoemSource
import net.ganjoorak.app.data.model.Poet
import net.ganjoorak.app.data.model.VerseSync
import net.ganjoorak.app.util.HtmlUtils
import net.ganjoorak.app.util.PoetKeys
import java.util.Locale

class PoemRepository(
    private val ganjoorApi: GanjoorApi,
    private val echolaliaApi: EcholaliaApi,
    private val context: Context,
    private val json: Json,
) {
    private val customBundles = mutableMapOf<String, CustomPoetBundleDto>()

    suspend fun getRandomGanjoorPoem(): Poem =
        ganjoorApi.getRandomPoem().toPoem().let { loadFullIfNeeded(it) }

    suspend fun getRandomPoemByPoetId(poetId: Int): Poem =
        ganjoorApi.getRandomPoemByPoetId(poetId).toPoem().let { loadFullIfNeeded(it) }

    suspend fun getPoemById(id: Int): Poem =
        ganjoorApi.getPoemById(id).toPoem()

    suspend fun getPoets(): List<Poet> =
        ganjoorApi.getPoets().map { it.toPoet() }

    suspend fun searchPoems(term: String): List<PoemSearchResult> {
        val normalized = term.trim()
        if (normalized.length < 2) return emptyList()
        return ganjoorApi.searchPoems(normalized).map { it.toSearchResult() }
    }

    suspend fun getRecitationVerses(recitationId: Int): List<VerseSync> =
        ganjoorApi.getRecitationVerses(recitationId).toVerseSync()

    suspend fun getRandomPoemForFollowedKey(key: String): Poem {
        val parsed = PoetKeys.parse(key)
        return when (parsed.source) {
            PoemSource.CUSTOM -> getRandomCustomPoem(parsed.slug)
            PoemSource.ECHOLALIA -> getRandomEcholaliaPoem(parsed.slug)
            PoemSource.GANJOOR -> {
                val poetId = PoetKeys.ganjoorPoetId(parsed.slug)
                if (poetId != null) {
                    getRandomPoemByPoetId(poetId)
                } else {
                    getRandomGanjoorPoem()
                }
            }
        }
    }

    private suspend fun loadFullIfNeeded(poem: Poem): Poem {
        if (poem.recitations.isNotEmpty() && poem.plainText.isNotBlank()) return poem
        return getPoemById(poem.id)
    }

    suspend fun getCustomPoets(): List<Poet> = listOf(
        loadCustomBundle("rahmani"),
        loadCustomBundle("farrokhzad"),
    ).map { bundle ->
        val slug = bundle.poetSlug
        Poet(
            id = when (slug) {
                "rahmani" -> 101
                "farrokhzad" -> 102
                else -> slug.hashCode()
            },
            name = bundle.poet,
            description = null,
            fullUrl = slug,
            urlSlug = slug,
            rootCatId = 0,
            nickname = bundle.poet,
            published = true,
            imageUrl = bundle.imageUrl.orEmpty(),
            source = PoemSource.CUSTOM,
            sourceGroupName = "شاعران محلی",
        )
    }

    private suspend fun loadCustomBundle(slug: String): CustomPoetBundleDto =
        customBundles.getOrPut(slug) {
            withContext(Dispatchers.IO) {
                context.assets.open("poems/$slug.json").use { stream ->
                    json.decodeFromString(CustomPoetBundleDto.serializer(), stream.readBytes().decodeToString())
                }
            }
        }

    suspend fun getRandomCustomPoem(slug: String): Poem {
        val bundle = loadCustomBundle(slug)
        val poem = bundle.poems.randomOrNull() ?: error("شعری برای این شاعر یافت نشد")
        val poetName = bundle.poet
        return Poem(
            id = poem.id,
            title = poem.title,
            fullTitle = "$poetName » ${poem.title}",
            poet = poetName,
            poetNickname = poetName,
            poetSlug = slug,
            poetImageUrl = bundle.imageUrl.orEmpty(),
            urlSlug = poem.title,
            fullUrl = poem.source ?: "/$slug/${poem.id}",
            plainText = poem.text,
            recitations = emptyList(),
            source = PoemSource.CUSTOM,
            isCustom = true,
        )
    }

    suspend fun getEcholaliaPoets(): List<Poet> {
        val rootCategories = echolaliaApi.getCategories(parent = 0)
        val sherRoot = rootCategories.firstOrNull { it.slug == "sher" } ?: return emptyList()
        return echolaliaApi.getCategories(parent = sherRoot.id)
            .filter { it.slug !in hiddenEcholaliaPoets }
            .map { category ->
                Poet(
                    id = category.id,
                    name = HtmlUtils.decode(category.name),
                    description = category.description?.let(HtmlUtils::decode),
                    fullUrl = category.slug,
                    urlSlug = category.slug,
                    rootCatId = category.id,
                    nickname = HtmlUtils.decode(category.name),
                    published = true,
                    imageUrl = "",
                    source = PoemSource.ECHOLALIA,
                    sourceGroupName = "اکولالیا",
                )
            }
    }

    suspend fun getRandomEcholaliaPoem(poetSlug: String): Poem {
        val poets = getEcholaliaPoets()
        val poet = poets.firstOrNull { it.urlSlug == poetSlug }
            ?: error("شاعر اکولالیا یافت نشد")
        val posts = echolaliaApi.getPosts(categoryId = poet.id)
        val post = posts.randomOrNull() ?: error("شعری یافت نشد")
        return post.toPoem(poet)
    }

    suspend fun getEcholaliaPoem(postId: Int, poetSlug: String): Poem {
        val poets = getEcholaliaPoets()
        val poet = poets.firstOrNull { it.urlSlug == poetSlug }
            ?: error("شاعر اکولالیا یافت نشد")
        return echolaliaApi.getPost(postId).toPoem(poet)
    }

    private fun EcholaliaPostDto.toPoem(poet: Poet): Poem {
        val title = HtmlUtils.decode(title.rendered)
        val content = HtmlUtils.stripHtml(content?.rendered.orEmpty())
        return Poem(
            id = id,
            title = title,
            fullTitle = "${poet.name} » $title",
            poet = poet.name,
            poetNickname = poet.nickname ?: poet.name,
            poetSlug = poet.urlSlug,
            poetImageUrl = "",
            urlSlug = slug,
            fullUrl = "/echolalia/${poet.urlSlug}/$id",
            plainText = content,
            recitations = emptyList(),
            source = PoemSource.ECHOLALIA,
        )
    }

    companion object {
        private val hiddenEcholaliaPoets = setOf("forough-farrokhzad")
    }
}
