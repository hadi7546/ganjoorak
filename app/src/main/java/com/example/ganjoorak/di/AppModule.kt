package com.example.ganjoorak.di

import android.content.Context
import androidx.room.Room
import com.example.ganjoorak.data.api.GanjoorApiService
import com.example.ganjoorak.data.database.GanjoorakDatabase
import com.example.ganjoorak.data.database.PoemDao
import com.example.ganjoorak.data.database.PoetDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    private const val BASE_URL = "https://api.ganjoor.net/"

    @Singleton
    @Provides
    fun provideGanjoorakDatabase(
        @ApplicationContext app: Context
    ) = Room.databaseBuilder(
        app,
        GanjoorakDatabase::class.java,
        "ganjoorak_database"
    ).build()

    @Singleton
    @Provides
    fun providePoetDao(db: GanjoorakDatabase) = db.poetDao()

    @Singleton
    @Provides
    fun providePoemDao(db: GanjoorakDatabase) = db.poemDao()

    @Singleton
    @Provides
    fun provideHttpLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }

    @Singleton
    @Provides
    fun provideOkHttpClient(loggingInterceptor: HttpLoggingInterceptor): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .build()
    }

    @Singleton
    @Provides
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Singleton
    @Provides
    fun provideGanjoorApiService(retrofit: Retrofit): GanjoorApiService {
        return retrofit.create(GanjoorApiService::class.java)
    }
}
