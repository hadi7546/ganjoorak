package com.example.ganjoorak.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName

@Entity(tableName = "poems")
data class Poem(
    @PrimaryKey
    @SerializedName("id")
    val id: Int,
    @SerializedName("title")
    val title: String,
    @SerializedName("fullTitle")
    val fullTitle: String,
    @SerializedName("poet")
    val poet: String,
    @SerializedName("poetNickname")
    val poetNickname: String,
    @SerializedName("poetSlug")
    val poetSlug: String,
    @SerializedName("poetImageUrl")
    val poetImageUrl: String,
    @SerializedName("urlSlug")
    val urlSlug: String,
    @SerializedName("fullUrl")
    val fullUrl: String,
    @SerializedName("plainText")
    val plainText: String,
    @SerializedName("htmlText")
    val htmlText: String,
    @SerializedName("recitations")
    val recitations: List<PoemRecitation>,
    @SerializedName("isCustom")
    val isCustom: Boolean?,
    var lastRefreshed: Long = System.currentTimeMillis()
)

data class PoemRecitation(
    @SerializedName("id")
    val id: Int,
    @SerializedName("poemId")
    val poemId: Int,
    @SerializedName("poemFullTitle")
    val poemFullTitle: String,
    @SerializedName("poemFullUrl")
    val poemFullUrl: String,
    @SerializedName("audioTitle")
    val audioTitle: String,
    @SerializedName("audioArtist")
    val audioArtist: String,
    @SerializedName("audioArtistUrl")
    val audioArtistUrl: String,
    @SerializedName("audioSrc")
    val audioSrc: String,
    @SerializedName("audioSrcUrl")
    val audioSrcUrl: String,
    @SerializedName("legacyAudioGuid")
    val legacyAudioGuid: String,
    @SerializedName("mp3FileCheckSum")
    val mp3FileCheckSum: String,
    @SerializedName("mp3SizeInBytes")
    val mp3SizeInBytes: Long,
    @SerializedName("publishDate")
    val publishDate: String,
    @SerializedName("fileLastUpdated")
    val fileLastUpdated: String,
    @SerializedName("mp3Url")
    val mp3Url: String,
    @SerializedName("xmlText")
    val xmlText: String,
    @SerializedName("plainText")
    val plainText: String,
    @SerializedName("htmlText")
    val htmlText: String,
    @SerializedName("mistakes")
    val mistakes: List<Any>,
    @SerializedName("audioOrder")
    val audioOrder: Int,
    @SerializedName("recitationType")
    val recitationType: Int,
    @SerializedName("inSyncWithText")
    val inSyncWithText: Boolean,
    @SerializedName("upVotedByUser")
    val upVotedByUser: Boolean
)

data class VerseSync(
    @SerializedName("verseOrder")
    val verseOrder: Int,
    @SerializedName("verseText")
    val verseText: String,
    @SerializedName("audioStartMilliseconds")
    val audioStartMilliseconds: Long
)
