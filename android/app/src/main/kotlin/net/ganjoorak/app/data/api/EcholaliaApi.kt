package net.ganjoorak.app.data.api

import net.ganjoorak.app.data.model.EcholaliaCategoryDto
import net.ganjoorak.app.data.model.EcholaliaPostDto
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface EcholaliaApi {
    @GET("categories")
    suspend fun getCategories(
        @Query("parent") parent: Int,
        @Query("per_page") perPage: Int = 100,
    ): List<EcholaliaCategoryDto>

    @GET("posts")
    suspend fun getPosts(
        @Query("categories") categoryId: Int,
        @Query("per_page") perPage: Int = 100,
    ): List<EcholaliaPostDto>

    @GET("posts/{id}")
    suspend fun getPost(@Path("id") id: Int): EcholaliaPostDto
}
