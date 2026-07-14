package net.ganjoorak.app.ui.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors

@Composable
fun FloatingChrome(
    visible: Boolean,
    isZenLocked: Boolean,
    hasAudioOffset: Boolean,
    onOpenMenu: () -> Unit,
    onOpenSearch: () -> Unit,
    onToggleZenLock: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalGanjoorakColors.current
    val audioOffset = if (hasAudioOffset) 66.dp else 0.dp

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn() + scaleIn(initialScale = 0.96f),
        exit = fadeOut() + scaleOut(targetScale = 0.96f),
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier
                .navigationBarsPadding()
                .padding(end = 16.dp, bottom = 16.dp + audioOffset),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (!isZenLocked) {
                FloatingChromeButton(
                    onClick = onToggleZenLock,
                    active = false,
                    contentDescription = "قفل روی همین شعر",
                ) {
                    Icon(
                        imageVector = Icons.Default.LockOpen,
                        contentDescription = null,
                        tint = colors.foreground,
                        modifier = Modifier.size(16.dp),
                    )
                }
                FloatingChromeButton(
                    onClick = onOpenSearch,
                    contentDescription = "جستجو",
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = null,
                        tint = colors.foreground,
                        modifier = Modifier.size(16.dp),
                    )
                }
                FloatingChromeButton(
                    onClick = onOpenMenu,
                    contentDescription = "منو",
                ) {
                    Icon(
                        imageVector = Icons.Default.Menu,
                        contentDescription = null,
                        tint = colors.foreground,
                        modifier = Modifier.size(16.dp),
                    )
                }
            } else {
                FloatingChromeButton(
                    onClick = onToggleZenLock,
                    active = true,
                    contentDescription = "باز کردن قفل",
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = null,
                        tint = colors.onPrimary,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
    }
}

@Composable
fun FloatingChromeButton(
    onClick: () -> Unit,
    contentDescription: String,
    modifier: Modifier = Modifier,
    active: Boolean = false,
    content: @Composable () -> Unit,
) {
    val colors = LocalGanjoorakColors.current
    val background = if (active) {
        colors.accent.copy(alpha = 0.86f)
    } else {
        Color.White.copy(alpha = 0.10f)
    }

    Box(
        modifier = modifier
            .size(40.dp)
            .shadow(8.dp, CircleShape, clip = false)
            .clip(CircleShape)
            .background(background)
            .clickable(onClick = onClick)
            .semantics { this.contentDescription = contentDescription },
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}
