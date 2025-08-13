package com.example.ganjoorak.data.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.example.ganjoorak.data.model.Poem
import com.example.ganjoorak.data.model.Poet

@Database(entities = [Poet::class, Poem::class], version = 1, exportSchema = false)
@TypeConverters(Converters::class)
abstract class GanjoorakDatabase : RoomDatabase() {
    abstract fun poetDao(): PoetDao
    abstract fun poemDao(): PoemDao
}
