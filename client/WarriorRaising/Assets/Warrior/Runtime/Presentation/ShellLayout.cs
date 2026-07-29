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
            if (safeSize.x <= 0f || safeSize.y <= 0f)
            {
                throw new ArgumentOutOfRangeException(nameof(safeSize), safeSize, "Safe size must be positive.");
            }

            return new ShellLayoutResult(
                safeSize.y * ShellMetrics.CombatViewportRatio,
                ShellMetrics.BottomNavDp,
                state == ShellSheetState.Peek);
        }
    }
}
