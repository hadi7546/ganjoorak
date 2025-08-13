package com.example.ganjoorak.data.api

import com.example.ganjoorak.data.model.Century
import com.example.ganjoorak.data.model.Poem
import com.example.ganjoorak.data.model.Poet
import com.example.ganjoorak.data.model.VerseSync
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface GanjoorApiService {

    @GET("api/ganjoor/poem/random")
    suspend fun getRandomPoem(): Poem

    @GET("api/ganjoor/poem/{id}")
    suspend fun getPoemById(@Path("id") id: Int): Poem

    @GET("api/ganjoor/poets")
    suspend fun getPoets(): List<Poet>

    @GET("api/ganjoor/centuries")
    suspend fun getCenturies(): List<Century>

    @GET("api/ganjoor/poem/random")
    suspend fun getRandomPoemByPoet(@Query("poetId") poetId: Int): Poem

    @GET("api/ganjoor/poet")
    suspend fun getPoetBySlug(@Query("url") slug: String): Poet

    @GET("api/ganjoor/poem")
    suspend fun getPoemByUrl(@Query("url") url: String): Poem

    @GET("api/audio/verses/{recitationId}")
    suspend fun getRecitationVerses(@Path("recitationId") recitationId: Int): List<VerseSync>
}
