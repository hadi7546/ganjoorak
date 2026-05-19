package net.ganjoorak.app.di

import android.content.Context
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import net.ganjoorak.app.BuildConfig
import net.ganjoorak.app.data.api.EcholaliaApi
import net.ganjoorak.app.data.api.GanjoorApi
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.domain.settings.SettingsRepository
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

class AppContainer(context: Context) {
    private val appContext = context.applicationContext

    val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    private val okHttp = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .apply {
            if (BuildConfig.DEBUG) {
                addInterceptor(HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BASIC
                })
            }
        }
        .build()

    private val contentType = "application/json".toMediaType()

    private val ganjoorRetrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.GANJOOR_API_BASE_URL.trimEnd('/') + "/")
        .client(okHttp)
        .addConverterFactory(json.asConverterFactory(contentType))
        .build()

    private val echolaliaRetrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.ECHOLALIA_API_BASE_URL.trimEnd('/') + "/")
        .client(okHttp)
        .addConverterFactory(json.asConverterFactory(contentType))
        .build()

    val ganjoorApi: GanjoorApi = ganjoorRetrofit.create(GanjoorApi::class.java)
    val echolaliaApi: EcholaliaApi = echolaliaRetrofit.create(EcholaliaApi::class.java)

    val poemRepository = PoemRepository(ganjoorApi, echolaliaApi, appContext, json)
    val settingsRepository = SettingsRepository(appContext)
}
