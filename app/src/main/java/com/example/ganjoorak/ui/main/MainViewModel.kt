package com.example.ganjoorak.ui.main

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.ganjoorak.data.model.Poem
import com.example.ganjoorak.data.repository.GanjoorRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MainUiState(
    val isLoading: Boolean = true,
    val poem: Poem? = null,
    val error: String? = null
)

@HiltViewModel
class MainViewModel @Inject constructor(
    private val ganjoorRepository: GanjoorRepository
) : ViewModel() {

    private val _uiState = mutableStateOf(MainUiState())
    val uiState: State<MainUiState> = _uiState

    init {
        fetchRandomPoem()
    }

    fun fetchRandomPoem() {
        viewModelScope.launch {
            _uiState.value = MainUiState(isLoading = true)
            try {
                val poem = ganjoorRepository.getRandomPoem()
                _uiState.value = MainUiState(poem = poem)
            } catch (e: Exception) {
                _uiState.value = MainUiState(error = "Failed to fetch poem: ${e.message}")
            }
        }
    }
}
