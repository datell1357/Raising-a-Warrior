using System;
using UnityEngine;

namespace Warrior.Presentation
{
    public enum ShellSheetState
    {
        Closed,
        Peek
    }

    public readonly struct ShellLayoutResult
    {
        public ShellLayoutResult(float combatHeight, float bottomNavHeight, bool featureSheetYieldsFirst)
        {
            CombatHeight = combatHeight;
            BottomNavHeight = bottomNavHeight;
            FeatureSheetYieldsFirst = featureSheetYieldsFirst;
        }

        public float CombatHeight { get; }
        public float BottomNavHeight { get; }
        public bool FeatureSheetYieldsFirst { get; }
    }

    public static class ShellLayout
    {
        public static ShellLayoutResult Calculate(Vector2 safeSize, ShellSheetState state)
        {
            var fixedBands = ShellMetrics.StatusBarDp + ShellMetrics.QuestRibbonDp + ShellMetrics.BottomNavDp;
            var requestedSheet = state == ShellSheetState.Peek ? ShellMetrics.BottomNavDp : 0f;
            var minimumCombat = safeSize.y * MinimumCombatRatio(safeSize.x / safeSize.y);
            var available = safeSize.y - fixedBands;
            var sheet = Mathf.Min(requestedSheet, Mathf.Max(0f, available - minimumCombat));
            return new ShellLayoutResult(available - sheet, ShellMetrics.BottomNavDp, sheet < requestedSheet || state == ShellSheetState.Peek);
        }

        private static float MinimumCombatRatio(float widthToHeight)
        {
            if (widthToHeight <= 9f / 20f + 0.001f) return 0.32f;
            if (widthToHeight <= 9f / 19.5f + 0.001f) return 0.30f;
            if (widthToHeight <= 9f / 16f + 0.001f) return 0.26f;
            throw new ArgumentOutOfRangeException(nameof(widthToHeight), widthToHeight, "Portrait shell ratio is outside the L5 target matrix.");
        }
    }
}
