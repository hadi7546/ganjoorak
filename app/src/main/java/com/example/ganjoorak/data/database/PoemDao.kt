package com.example.ganjoorak.data.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.ganjoorak.data.model.Poem

@Dao
interface PoemDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(poem: Poem)

    @Query("SELECT * FROM poems WHERE id = :poemId")
    suspend fun getPoemById(poemId: Int): Poem?

    @Query("SELECT * FROM poems ORDER BY RANDOM() LIMIT 1")
    suspend fun getRandomPoem(): Poem?
}
