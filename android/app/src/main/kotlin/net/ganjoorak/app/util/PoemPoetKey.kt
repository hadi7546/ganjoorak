package net.ganjoorak.app.util

import net.ganjoorak.app.data.model.Poem
import net.ganjoorak.app.data.model.PoemSource

fun poemPoetKey(poem: Poem): String {
    val source = when (poem.source) {
        PoemSource.GANJOOR -> "ganjoor"
        PoemSource.CUSTOM -> "custom"
        PoemSource.ECHOLALIA -> "echolalia"
    }
    return "$source:${poem.poetSlug}"
}
