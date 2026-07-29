using UnityEngine;
using UnityEngine.UI;

namespace Warrior.Presentation
{
    public static class ShellCanvasDensity
    {
        public static void Configure(CanvasScaler scaler)
        {
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(ShellMetrics.LogicalWidthDp, ShellMetrics.LogicalHeightDp);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0f;
        }
    }

}
