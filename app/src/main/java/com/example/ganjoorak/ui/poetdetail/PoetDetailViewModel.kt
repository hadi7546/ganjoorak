package com.example.ganjoorak.ui.poetdetail

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.ganjoorak.data.model.Poet
import com.example.ganjoorak.data.repository.GanjoorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PoetDetailUiState(
    val isLoading: Boolean = true,
    val poet: Poet? = null,
    val error: String? = null
)

@HiltViewModel
class PoetDetailViewModel @Inject constructor(
    private val ganjoorRepository: GanjoorRepository
) : ViewModel() {

    private val _uiState = mutableStateOf(PoetDetailUiState())
    val uiState: State<PoetDetailUiState> = _uiState

    fun fetchPoet(poetSlug: String) {
        viewModelScope.launch {
            _uiState.value = PoetDetailUiState(isLoading = true)
            try {
                // The API expects the slug to start with a slash
                val poet = ganjoorRepository.getPoetBySlug("/$poetSlug")
                _uiState.value = PoetDetailUiState(poet = poet)
            } catch (e: Exception) {
                _uiState.value = PoetDetailUiState(error = "Failed to fetch poet details: ${e.message}")
            }
        }
    }
}
