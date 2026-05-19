package net.ganjoorak.app

import android.app.Application
import net.ganjoorak.app.di.AppContainer
import net.ganjoorak.app.util.PoetIndex

class GanjoorakApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        PoetIndex.load(this, container.json)
    }
}
