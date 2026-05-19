package net.ganjoorak.app.domain.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore("ganjoorak_settings")

class SettingsRepository(private val context: Context) {
    private val json = Json { ignoreUnknownKeys = true }

    val settings: Flow<AppSettings> = context.settingsDataStore.data.map { prefs ->
        AppSettings(
            theme = prefs[Keys.THEME]?.let { runCatching { AppTheme.valueOf(it) }.getOrNull() }
                ?: AppTheme.DARK,
            showLineNumbers = prefs[Keys.SHOW_LINE_NUMBERS] ?: false,
            fontFamily = prefs[Keys.FONT_FAMILY]?.let { runCatching { PoemFontFamily.valueOf(it) }.getOrNull() }
                ?: PoemFontFamily.VAZIRMATN,
            poemFontSize = AppSettings.clampFontSize(prefs[Keys.POEM_FONT_SIZE] ?: 100),
            poemViewerVisibility = decodeVisibility(prefs[Keys.VISIBILITY_JSON]),
            randomizePoems = prefs[Keys.RANDOMIZE_POEMS] ?: true,
            askRandomizePoemsOnPoetPages = prefs[Keys.ASK_RANDOMIZE] ?: true,
            followedPoetKeys = prefs[Keys.FOLLOWED_POETS]?.toList().orEmpty(),
            zenScrollLock = prefs[Keys.ZEN_LOCK] ?: false,
        )
    }

    suspend fun update(transform: (AppSettings) -> AppSettings) {
        context.settingsDataStore.edit { prefs ->
            val current = AppSettings(
                theme = prefs[Keys.THEME]?.let { runCatching { AppTheme.valueOf(it) }.getOrNull() }
                    ?: AppTheme.DARK,
                showLineNumbers = prefs[Keys.SHOW_LINE_NUMBERS] ?: false,
                fontFamily = prefs[Keys.FONT_FAMILY]?.let { runCatching { PoemFontFamily.valueOf(it) }.getOrNull() }
                    ?: PoemFontFamily.VAZIRMATN,
                poemFontSize = AppSettings.clampFontSize(prefs[Keys.POEM_FONT_SIZE] ?: 100),
                poemViewerVisibility = decodeVisibility(prefs[Keys.VISIBILITY_JSON]),
                randomizePoems = prefs[Keys.RANDOMIZE_POEMS] ?: true,
                askRandomizePoemsOnPoetPages = prefs[Keys.ASK_RANDOMIZE] ?: true,
                followedPoetKeys = prefs[Keys.FOLLOWED_POETS]?.toList().orEmpty(),
                zenScrollLock = prefs[Keys.ZEN_LOCK] ?: false,
            )
            val next = transform(current)
            prefs[Keys.THEME] = next.theme.name
            prefs[Keys.SHOW_LINE_NUMBERS] = next.showLineNumbers
            prefs[Keys.FONT_FAMILY] = next.fontFamily.name
            prefs[Keys.POEM_FONT_SIZE] = next.poemFontSize
            prefs[Keys.VISIBILITY_JSON] = json.encodeToString(next.poemViewerVisibility)
            prefs[Keys.RANDOMIZE_POEMS] = next.randomizePoems
            prefs[Keys.ASK_RANDOMIZE] = next.askRandomizePoemsOnPoetPages
            prefs[Keys.FOLLOWED_POETS] = next.followedPoetKeys.toSet()
            prefs[Keys.ZEN_LOCK] = next.zenScrollLock
        }
    }

    private fun decodeVisibility(raw: String?): PoemViewerVisibility {
        if (raw.isNullOrBlank()) return PoemViewerVisibility()
        return runCatching { json.decodeFromString(PoemViewerVisibility.serializer(), raw) }
            .getOrDefault(PoemViewerVisibility())
    }

    private object Keys {
        val THEME = stringPreferencesKey("theme")
        val SHOW_LINE_NUMBERS = booleanPreferencesKey("show_line_numbers")
        val FONT_FAMILY = stringPreferencesKey("font_family")
        val POEM_FONT_SIZE = intPreferencesKey("poem_font_size")
        val VISIBILITY_JSON = stringPreferencesKey("visibility_json")
        val RANDOMIZE_POEMS = booleanPreferencesKey("randomize_poems")
        val ASK_RANDOMIZE = booleanPreferencesKey("ask_randomize")
        val FOLLOWED_POETS = stringSetPreferencesKey("followed_poets")
        val ZEN_LOCK = booleanPreferencesKey("zen_lock")
    }
}
