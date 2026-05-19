package net.ganjoorak.app.data.api

import net.ganjoorak.app.data.model.GanjoorCenturyDto
import net.ganjoorak.app.data.model.GanjoorPoemDto
import net.ganjoorak.app.data.model.GanjoorPoetDto
import net.ganjoorak.app.data.model.GanjoorSearchResultDto
import net.ganjoorak.app.data.model.VerseSyncDto
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface GanjoorApi {
    @GET("api/ganjoor/poem/random")
    suspend fun getRandomPoem(): GanjoorPoemDto

    @GET("api/ganjoor/poem/random")
    suspend fun getRandomPoemByPoetId(@Query("poetId") poetId: Int): GanjoorPoemDto

    @GET("api/ganjoor/poem/{id}")
    suspend fun getPoemById(@Path("id") id: Int): GanjoorPoemDto

    @GET("api/ganjoor/poets")
    suspend fun getPoets(): List<GanjoorPoetDto>

    @GET("api/ganjoor/centuries")
    suspend fun getCenturies(): List<GanjoorCenturyDto>

    @GET("api/ganjoor/poems/search")
    suspend fun searchPoems(
        @Query("term") term: String,
        @Query("PageNumber") pageNumber: Int = 1,
        @Query("PageSize") pageSize: Int = 12,
    ): List<GanjoorSearchResultDto>

    @GET("api/audio/verses/{recitationId}")
    suspend fun getRecitationVerses(@Path("recitationId") recitationId: Int): List<VerseSyncDto>
}
