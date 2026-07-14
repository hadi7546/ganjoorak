package net.ganjoorak.app.ui.menu

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import net.ganjoorak.app.ui.theme.LocalGanjoorakColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppMenuSheet(
    isZenLocked: Boolean,
    onToggleZenLock: () -> Unit,
    onNavigateHome: () -> Unit,
    onNavigatePoets: () -> Unit,
    onOpenFeedPoets: () -> Unit,
    onOpenSettings: () -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalGanjoorakColors.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var isMoreOpen by remember { mutableStateOf(false) }
    val itemShape = RoundedCornerShape(15.dp)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = colors.background.copy(alpha = 0.96f),
        contentColor = colors.foreground,
        tonalElevation = 0.dp,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(top = 10.dp, bottom = 4.dp)
                    .width(44.dp)
                    .height(4.dp)
                    .clip(CircleShape)
                    .background(colors.foreground.copy(alpha = 0.22f)),
            )
        },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 12.dp)
                .padding(bottom = 16.dp)
                .heightIn(max = 460.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            MenuRow(
                icon = if (isZenLocked) Icons.Default.Lock else Icons.Default.LockOpen,
                label = if (isZenLocked) "باز کردن قفل" else "قفل روی همین شعر",
                onClick = onToggleZenLock,
                shape = itemShape,
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                MenuGridItem(
                    icon = Icons.Default.Home,
                    label = "صفحه اصلی",
                    onClick = {
                        onNavigateHome()
                        onDismiss()
                    },
                    modifier = Modifier.weight(1f),
                    shape = itemShape,
                )
                MenuGridItem(
                    icon = Icons.Default.People,
                    label = "شاعران",
                    onClick = {
                        onNavigatePoets()
                        onDismiss()
                    },
                    modifier = Modifier.weight(1f),
                    shape = itemShape,
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(itemShape)
                    .border(1.dp, colors.foreground.copy(alpha = 0.1f), itemShape)
                    .background(colors.foreground.copy(alpha = 0.04f))
                    .clickable { isMoreOpen = !isMoreOpen }
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "بیشتر",
                    style = MaterialTheme.typography.bodyLarge,
                    color = colors.foreground,
                )
                Icon(
                    imageVector = if (isMoreOpen) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    tint = colors.muted,
                )
            }

            AnimatedVisibility(
                visible = isMoreOpen,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut(),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    MenuRow(
                        icon = Icons.Default.Book,
                        label = "شاعران فید",
                        onClick = {
                            onOpenFeedPoets()
                            onDismiss()
                        },
                        shape = itemShape,
                    )
                }
            }

            Spacer(Modifier.height(2.dp))

            MenuRow(
                icon = Icons.Default.Settings,
                label = "تنظیمات",
                onClick = {
                    onOpenSettings()
                    onDismiss()
                },
                shape = itemShape,
            )
        }
    }
}

@Composable
private fun MenuRow(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    shape: RoundedCornerShape,
) {
    val colors = LocalGanjoorakColors.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(colors.foreground.copy(alpha = 0.035f))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = colors.foreground.copy(alpha = 0.82f),
            modifier = Modifier.size(20.dp),
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodyLarge,
            color = colors.foreground,
        )
    }
}

@Composable
private fun MenuGridItem(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape,
) {
    val colors = LocalGanjoorakColors.current
    Column(
        modifier = modifier
            .clip(shape)
            .background(colors.foreground.copy(alpha = 0.035f))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 14.dp)
            .heightIn(min = 50.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = colors.foreground.copy(alpha = 0.82f),
            modifier = Modifier.size(20.dp),
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = colors.foreground,
            textAlign = TextAlign.Center,
        )
    }
}
