package net.ganjoorak.app

import android.app.Application
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import net.ganjoorak.app.di.AppContainer
import net.ganjoorak.app.util.PoetIndex

class GanjoorakApplication : Application() {
    lateinit var container: AppContainer
        private set

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        appScope.launch {
            runCatching { PoetIndex.load(this@GanjoorakApplication, container.json) }
                .onFailure { Log.e(TAG, "Poet index load failed", it) }
        }
    }

    companion object {
        private const val TAG = "GanjoorakApplication"
    }
}
