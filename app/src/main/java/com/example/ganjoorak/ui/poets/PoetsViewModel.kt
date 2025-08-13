package com.example.ganjoorak.ui.poets

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.ganjoorak.data.model.Century
import com.example.ganjoorak.data.repository.GanjoorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PoetsUiState(
    val isLoading: Boolean = true,
    val centuries: List<Century> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class PoetsViewModel @Inject constructor(
    private val ganjoorRepository: GanjoorRepository
) : ViewModel() {

    private val _uiState = mutableStateOf(PoetsUiState())
    val uiState: State<PoetsUiState> = _uiState

    init {
        fetchCenturies()
    }

    fun fetchCenturies() {
        viewModelScope.launch {
            _uiState.value = PoetsUiState(isLoading = true)
            try {
                val centuries = ganjoorRepository.getCenturies()
                _uiState.value = PoetsUiState(centuries = centuries)
            } catch (e: Exception) {
                _uiState.value = PoetsUiState(error = "Failed to fetch poets: ${e.message}")
            }
        }
    }
}
