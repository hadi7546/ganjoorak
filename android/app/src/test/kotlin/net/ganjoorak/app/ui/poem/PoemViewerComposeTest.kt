package net.ganjoorak.app.ui.poem

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import io.mockk.coEvery
import io.mockk.mockk
import net.ganjoorak.app.audio.PoemAudioPlayer
import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.data.model.PoemRecitation
import net.ganjoorak.app.data.repository.PoemRepository
import net.ganjoorak.app.domain.settings.AppSettings
import net.ganjoorak.app.ui.theme.GanjoorakTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class PoemViewerComposeTest {
    @get:Rule
    val composeRule = createComposeRule()

    private val samplePoem = Poem(
        id = 1,
        title = "تست",
        fullTitle = "حافظ » تست",
        poet = "حافظ",
        poetNickname = "حافظ",
        poetSlug = "hafez",
        poetImageUrl = "",
        urlSlug = "test",
        fullUrl = "/hafez/test",
        plainText = "اولین بیت\nدومین بیت\nسومین بیت\nچهارمین بیت",
        recitations = listOf(
            PoemRecitation(
                id = 1,
                audioTitle = "خوانش",
                audioArtist = "گوینده",
                mp3Url = "http://example.com/a.mp3",
                inSyncWithText = false,
            ),
        ),
    )

    @Test
    fun poemViewer_rendersSamplePoem() {
        val context = RuntimeEnvironment.getApplication()
        val audio = PoemAudioPlayer(context)
        val poemRepository = mockk<PoemRepository>()
        coEvery { poemRepository.getRecitationVerses(any()) } returns emptyList()

        composeRule.setContent {
            GanjoorakTheme {
                PoemViewerScreen(
                    poem = samplePoem,
                    settings = AppSettings(),
                    isFirst = true,
                    isLast = true,
                    isPreparingNext = false,
                    poemRepository = poemRepository,
                    audioPlayer = audio,
                    onNext = {},
                    onPrevious = {},
                    onNavigateToPoet = {},
                    isActivePage = true,
                )
            }
        }

        composeRule.onNodeWithText("تست").assertExists()
        audio.release()
    }
}
