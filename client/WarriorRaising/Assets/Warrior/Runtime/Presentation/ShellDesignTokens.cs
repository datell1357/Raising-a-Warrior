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
        Shadow,
        Rim
    }

    public static class ShellDesignTokens
    {
        public static Color32 Color(ShellColorToken token)
        {
            switch (token)
            {
                case ShellColorToken.Void: return Rgb(0x07, 0x14, 0x21);
                case ShellColorToken.Navy900: return Rgb(0x0C, 0x1C, 0x2A);
                case ShellColorToken.Navy800: return Rgb(0x13, 0x2A, 0x3B);
                case ShellColorToken.Navy700: return Rgb(0x1B, 0x39, 0x4D);
                case ShellColorToken.Line: return Rgb(0x34, 0x52, 0x68);
                case ShellColorToken.TextPrimary: return Rgb(0xF2, 0xF7, 0xF8);
                case ShellColorToken.TextSecondary: return Rgb(0xA9, 0xBD, 0xC6);
                case ShellColorToken.TextDisabled: return Rgb(0x66, 0x7D, 0x88);
                case ShellColorToken.Teal500: return Rgb(0x2B, 0xCB, 0xBB);
                case ShellColorToken.Teal700: return Rgb(0x16, 0x98, 0x8F);
                case ShellColorToken.Ember500: return Rgb(0xF2, 0x8A, 0x45);
                case ShellColorToken.Ember700: return Rgb(0xBE, 0x5E, 0x2D);
                case ShellColorToken.Shadow: return new Color32(0x02, 0x08, 0x0F, 0xB3);
                case ShellColorToken.Rim: return new Color32(0xF2, 0xF7, 0xF8, 0x26);
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
        public const float StatusBarDp = 56f;
        public const float QuestRibbonDp = 48f;
        public const float RadiusSmallDp = 4f;
        public const float RadiusMediumDp = 8f;
        public const float StrokeDefaultDp = 1f;
        public const float TypeH3Sp = 16f;
        public const float TypeBodySp = 14f;
        public const float TypeLabelSp = 12f;
    }
}
