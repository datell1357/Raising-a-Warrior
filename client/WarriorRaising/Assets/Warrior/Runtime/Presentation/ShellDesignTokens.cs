using System;
using UnityEngine;

namespace Warrior.Presentation
{
    public enum ShellColorToken
    {
        Void,
        Navy900,
        Navy800,
        Navy700,
        Line,
        TextPrimary,
        TextSecondary,
        TextDisabled,
        Teal500,
        Teal700,
        Ember500,
        Ember700,
        ResourceGreen,
        BadgeRed,
        Shadow,
        Rim
    }

    public static class ShellDesignTokens
    {
        public static Color32 Color(ShellColorToken token)
        {
            switch (token)
            {
                case ShellColorToken.Void: return Rgb(0x09, 0x06, 0x04);
                case ShellColorToken.Navy900: return Rgb(0x17, 0x11, 0x0E);
                case ShellColorToken.Navy800: return Rgb(0x24, 0x1A, 0x14);
                case ShellColorToken.Navy700: return Rgb(0x33, 0x24, 0x1A);
                case ShellColorToken.Line: return Rgb(0x6B, 0x4A, 0x2E);
                case ShellColorToken.TextPrimary: return Rgb(0xF7, 0xF1, 0xE8);
                case ShellColorToken.TextSecondary: return Rgb(0xC8, 0xBB, 0xA8);
                case ShellColorToken.TextDisabled: return Rgb(0x7D, 0x70, 0x62);
                case ShellColorToken.Teal500: return Rgb(0x17, 0xC8, 0xE6);
                case ShellColorToken.Teal700: return Rgb(0x0A, 0x8F, 0xA8);
                case ShellColorToken.Ember500: return Rgb(0xF5, 0xA6, 0x23);
                case ShellColorToken.Ember700: return Rgb(0xB8, 0x67, 0x16);
                case ShellColorToken.ResourceGreen: return Rgb(0x53, 0xD7, 0x69);
                case ShellColorToken.BadgeRed: return Rgb(0xF0, 0x44, 0x44);
                case ShellColorToken.Shadow: return new Color32(0x03, 0x02, 0x01, 0xC7);
                case ShellColorToken.Rim: return new Color32(0xF5, 0xA6, 0x23, 0x3D);
                default: throw new ArgumentOutOfRangeException(nameof(token), token, null);
            }
        }

        private static Color32 Rgb(byte red, byte green, byte blue)
        {
            return new Color32(red, green, blue, 0xFF);
        }
    }

    public static class ShellMetrics
    {
        public const float LogicalWidthDp = 360f;
        public const float LogicalHeightDp = 800f;
        public const float Space1Dp = 4f;
        public const float Space2Dp = 8f;
        public const float Space3Dp = 12f;
        public const float Space4Dp = 16f;
        public const float Space6Dp = 24f;
        public const float Space8Dp = 32f;
        public const float MinimumTargetDp = 48f;
        public const float ControlLargeDp = 56f;
        public const float BottomNavDp = 64f;
        public const float StatusBarDp = 44f;
        public const float QuestRibbonDp = 36f;
        public const float CombatViewportDp = 360f;
        public const float QuickBarDp = 72f;
        public const float FeaturePanelDp = 224f;
        public const float CombatViewportRatio = 0.45f;
        public const float RadiusSmallDp = 4f;
        public const float RadiusMediumDp = 8f;
        public const float StrokeDefaultDp = 1f;
        public const float TypeH3Sp = 16f;
        public const float TypeBodySp = 14f;
        public const float TypeLabelSp = 12f;
    }
}
