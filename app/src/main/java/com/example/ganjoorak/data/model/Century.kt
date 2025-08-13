package com.example.ganjoorak.data.model

import com.google.gson.annotations.SerializedName

data class Century(
    @SerializedName("id")
    val id: Int,
    @SerializedName("name")
    val name: String,
    @SerializedName("halfCenturyOrder")
    val halfCenturyOrder: Int,
    @SerializedName("startYear")
    val startYear: Int,
    @SerializedName("endYear")
    val endYear: Int,
    @SerializedName("showInTimeLine")
    val showInTimeLine: Boolean,
    @SerializedName("poets")
    val poets: List<Poet>
)
