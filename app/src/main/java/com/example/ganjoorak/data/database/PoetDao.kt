package com.example.ganjoorak.data.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.ganjoorak.data.model.Poet

@Dao
interface PoetDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(poets: List<Poet>)

    @Query("SELECT * FROM poets")
    suspend fun getAll(): List<Poet>

    @Query("SELECT * FROM poets WHERE id = :poetId")
    suspend fun getPoetById(poetId: Int): Poet?

    @Query("SELECT * FROM poets WHERE urlSlug = :slug")
    suspend fun getPoetBySlug(slug: String): Poet?
}
