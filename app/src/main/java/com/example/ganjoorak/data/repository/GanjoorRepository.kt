package com.example.ganjoorak.data.repository

import com.example.ganjoorak.data.api.GanjoorApiService
import com.example.ganjoorak.data.database.PoemDao
import com.example.ganjoorak.data.database.PoetDao
import com.example.ganjoorak.data.model.Poem
import com.example.ganjoorak.data.model.Poet
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GanjoorRepository @Inject constructor(
    private val ganjoorApiService: GanjoorApiService,
    private val poetDao: PoetDao,
    private val poemDao: PoemDao
) {
    // A simple in-memory cache for centuries
    private var centuriesCache: List<com.example.ganjoorak.data.model.Century>? = null

    suspend fun getRandomPoem(): Poem {
        val cachedPoem = poemDao.getRandomPoem()
        if (cachedPoem != null) {
            return cachedPoem
        }
        val poem = ganjoorApiService.getRandomPoem()
        poemDao.insert(poem)
        return poem
    }

    suspend fun getPoemById(id: Int): Poem {
        val cachedPoem = poemDao.getPoemById(id)
        if (cachedPoem != null) {
            return cachedPoem
        }
        val poem = ganjoorApiService.getPoemById(id)
        poemDao.insert(poem)
        return poem
    }

    suspend fun getPoets(): List<Poet> {
        val cachedPoets = poetDao.getAll()
        if (cachedPoets.isNotEmpty()) {
            return cachedPoets
        }
        val poets = ganjoorApiService.getPoets()
        poetDao.insertAll(poets)
        return poets
    }

    suspend fun getCenturies(): List<com.example.ganjoorak.data.model.Century> {
        if (centuriesCache != null) {
            return centuriesCache!!
        }
        val centuries = ganjoorApiService.getCenturies()
        centuriesCache = centuries
        return centuries
    }

    suspend fun getPoetBySlug(slug: String): Poet {
        val cachedPoet = poetDao.getPoetBySlug(slug)
        if (cachedPoet != null) {
            return cachedPoet
        }
        val poet = ganjoorApiService.getPoetBySlug(slug)
        poetDao.insertAll(listOf(poet))
        return poet
    }
}
