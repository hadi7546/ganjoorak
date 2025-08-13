package com.example.ganjoorak.data.database

import androidx.room.TypeConverter
import com.example.ganjoorak.data.model.PoemRecitation
import com.example.ganjoorak.data.model.Poet
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

class Converters {
    @TypeConverter
    fun fromPoemRecitationList(value: List<PoemRecitation>): String {
        val gson = Gson()
        val type = object : TypeToken<List<PoemRecitation>>() {}.type
        return gson.toJson(value, type)
    }

    @TypeConverter
    fun toPoemRecitationList(value: String): List<PoemRecitation> {
        val gson = Gson()
        val type = object : TypeToken<List<PoemRecitation>>() {}.type
        return gson.fromJson(value, type)
    }

    @TypeConverter
    fun fromPoetList(value: List<Poet>): String {
        val gson = Gson()
        val type = object : TypeToken<List<Poet>>() {}.type
        return gson.toJson(value, type)
    }

    @TypeConverter
    fun toPoetList(value: String): List<Poet> {
        val gson = Gson()
        val type = object : TypeToken<List<Poet>>() {}.type
        return gson.fromJson(value, type)
    }
}
