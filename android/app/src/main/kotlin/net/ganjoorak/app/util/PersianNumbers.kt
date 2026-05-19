package net.ganjoorak.app.util

import java.util.Locale

private val persianDigits = charArrayOf('۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹')

fun Int.toPersianDigits(): String =
    String.format(Locale("fa", "IR"), "%,d", this)
        .map { char ->
            if (char.isDigit()) persianDigits[char.digitToInt()] else char
        }
        .joinToString("")

fun Float.toPersianTime(): String {
    val totalSeconds = toInt()
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "${minutes.toPersianDigits()}:${seconds.toString().padStart(2, '0').map { if (it.isDigit()) persianDigits[it.digitToInt()] else it }.joinToString("")}"
}
