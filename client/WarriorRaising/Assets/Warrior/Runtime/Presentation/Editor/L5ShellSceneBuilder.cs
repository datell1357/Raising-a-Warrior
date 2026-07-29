#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Warrior.Presentation;

public static class L5ShellSceneBuilder
{
    private const string ScenePath = "Assets/Scenes/Bootstrap.unity";
    private const string BuildMenu = "Warrior Raising/Build L5 Shell Scene";
    private static readonly Vector2 FullMin = Vector2.zero;
    private static readonly Vector2 FullMax = Vector2.one;

    [MenuItem(BuildMenu)]
    public static void Build()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var camera = CreateCamera();
        var canvas = CreateCanvas(camera);
        CreateGraphic("Background", canvas.transform, FullMin, FullMax, Vector2.zero, Vector2.zero, ShellColorToken.Void, false);
        var safeArea = CreateRect("SafeAreaRoot", canvas.transform, FullMin, FullMax, Vector2.zero, Vector2.zero);
        safeArea.gameObject.AddComponent<SafeAreaRoot>().Configure(safeArea);

        CreateStatusBar(safeArea);
        CreateQuestRibbon(safeArea);
        CreateCombatRegion(safeArea);
        CreateFeatureSheet(safeArea);
        CreateBottomNav(safeArea);

        if (!AssetDatabase.IsValidFolder("Assets/Scenes")) AssetDatabase.CreateFolder("Assets", "Scenes");
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        AssetDatabase.SaveAssets();
    }

    private static Camera CreateCamera()
    {
        var cameraObject = new GameObject("ShellCamera", typeof(Camera));
        cameraObject.tag = "MainCamera";
        var camera = cameraObject.GetComponent<Camera>();
        camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = ShellDesignTokens.Color(ShellColorToken.Void);
        camera.orthographic = true;
        camera.nearClipPlane = -10f;
        camera.farClipPlane = 10f;
        return camera;
    }

    private static Canvas CreateCanvas(Camera camera)
    {
        var canvasObject = new GameObject("ShellCanvas", typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
        var canvas = canvasObject.GetComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceCamera;
        canvas.worldCamera = camera;
        canvas.planeDistance = 1f;
        var scaler = canvasObject.GetComponent<CanvasScaler>();
        ShellCanvasDensity.Configure(scaler);
        return canvas;
    }

    private static void CreateStatusBar(RectTransform parent)
    {
        var bar = CreateTopBand("StatusBar", parent, 0f, ShellMetrics.StatusBarDp, ShellColorToken.Navy900);
        CreateGraphic("StableSeam", bar, new Vector2(0f, 0f), new Vector2(0f, 1f), Vector2.zero, new Vector2(ShellMetrics.Space1Dp, 0f), ShellColorToken.Teal500, false);
        CreateText("StatusTitle", bar, ShellCopyKey.StatusTitle, ShellMetrics.TypeH3Sp, ShellColorToken.TextPrimary,
            new Vector2(0f, 0.42f), new Vector2(1f, 1f), new Vector2(ShellMetrics.Space4Dp, 0f), new Vector2(-ShellMetrics.Space4Dp, 0f), TextAnchor.LowerLeft);
        CreateText("StatusSubtitle", bar, ShellCopyKey.StatusSubtitle, ShellMetrics.TypeLabelSp, ShellColorToken.TextSecondary,
            new Vector2(0f, 0f), new Vector2(1f, 0.42f), new Vector2(ShellMetrics.Space4Dp, 0f), new Vector2(-ShellMetrics.Space4Dp, 0f), TextAnchor.UpperLeft);
    }

    private static void CreateQuestRibbon(RectTransform parent)
    {
        var bar = CreateTopBand("QuestRibbon", parent, ShellMetrics.StatusBarDp, ShellMetrics.QuestRibbonDp, ShellColorToken.Navy800);
        CreateText("QuestPrimary", bar, ShellCopyKey.QuestEmpty, ShellMetrics.TypeBodySp, ShellColorToken.TextPrimary,
            new Vector2(0f, 0f), new Vector2(0.58f, 1f), new Vector2(ShellMetrics.Space4Dp, 0f), Vector2.zero, TextAnchor.MiddleLeft);
        CreateText("QuestSecondary", bar, ShellCopyKey.QuestHint, ShellMetrics.TypeLabelSp, ShellColorToken.TextSecondary,
            new Vector2(0.58f, 0f), new Vector2(1f, 1f), Vector2.zero, new Vector2(-ShellMetrics.Space4Dp, 0f), TextAnchor.MiddleRight);
    }

    private static void CreateCombatRegion(RectTransform parent)
    {
        var top = ShellMetrics.StatusBarDp + ShellMetrics.QuestRibbonDp;
        var bottom = ShellMetrics.BottomNavDp * 2f;
        var combat = CreateRect("CombatRegion", parent, FullMin, FullMax, new Vector2(0f, bottom), new Vector2(0f, -top));
        CreateGraphic("CombatPlate", combat, FullMin, FullMax, new Vector2(ShellMetrics.Space2Dp, ShellMetrics.Space2Dp), new Vector2(-ShellMetrics.Space2Dp, -ShellMetrics.Space2Dp), ShellColorToken.Navy900, true);
        var overlay = CreateRect("CombatViewportOverlay", combat, FullMin, FullMax, new Vector2(ShellMetrics.Space4Dp, ShellMetrics.Space4Dp), new Vector2(-ShellMetrics.Space4Dp, -ShellMetrics.Space4Dp));
        CreateText("StageLabel", overlay, ShellCopyKey.StageIdle, ShellMetrics.TypeLabelSp, ShellColorToken.Teal500,
            new Vector2(0f, 0.9f), new Vector2(1f, 1f), Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
        CreateForgeCore(overlay);
        CreateConstellationSeam(overlay);
        CreateQuickSlots(overlay);
    }

    private static void CreateForgeCore(RectTransform parent)
    {
        var halfSize = ShellMetrics.Space8Dp * 4f;
        var rim = CreateGraphic("ForgeRim", parent, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), Vector2.one * -halfSize, Vector2.one * halfSize, ShellColorToken.Line, true);
        var core = CreateGraphic("ForgeCore", rim, FullMin, FullMax, Vector2.one * ShellMetrics.StrokeDefaultDp, Vector2.one * -ShellMetrics.StrokeDefaultDp, ShellColorToken.Navy800, true);
        CreateText("CombatWaiting", core, ShellCopyKey.CombatWaiting, ShellMetrics.TypeBodySp, ShellColorToken.TextSecondary,
            FullMin, FullMax, new Vector2(ShellMetrics.Space6Dp, 0f), new Vector2(-ShellMetrics.Space6Dp, 0f), TextAnchor.MiddleCenter);
    }

    private static void CreateConstellationSeam(RectTransform parent)
    {
        var line = CreateGraphic("ConstellationSeam", parent, new Vector2(0.14f, 0.66f), new Vector2(0.86f, 0.66f), Vector2.zero, new Vector2(0f, ShellMetrics.StrokeDefaultDp), ShellColorToken.Line, false);
        line.localRotation = Quaternion.Euler(0f, 0f, -8f);
        var anchors = new[] { new Vector2(0.18f, 0.69f), new Vector2(0.42f, 0.65f), new Vector2(0.67f, 0.62f), new Vector2(0.84f, 0.58f) };
        for (var index = 0; index < anchors.Length; index++)
        {
            var half = index == 1 ? ShellMetrics.Space2Dp : ShellMetrics.Space1Dp;
            CreateGraphic($"StarNode{index + 1}", parent, anchors[index], anchors[index], Vector2.one * -half, Vector2.one * half,
                index == 1 ? ShellColorToken.Teal500 : ShellColorToken.Rim, false);
        }
    }

    private static void CreateQuickSlots(RectTransform parent)
    {
        var total = ShellMetrics.ControlLargeDp * 4f + ShellMetrics.Space2Dp * 3f;
        for (var index = 0; index < 4; index++)
        {
            var left = -total * 0.5f + index * (ShellMetrics.ControlLargeDp + ShellMetrics.Space2Dp);
            var slot = CreateTarget($"QuickSlot{index + 1}", parent, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f),
                new Vector2(left, ShellMetrics.Space4Dp), new Vector2(left + ShellMetrics.ControlLargeDp, ShellMetrics.Space4Dp + ShellMetrics.ControlLargeDp), ShellColorToken.Navy700);
            CreateText("Label", slot, ShellCopyKey.QuickSlotEmpty, ShellMetrics.TypeLabelSp, ShellColorToken.TextSecondary, FullMin, FullMax, Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
        }
    }

    private static void CreateFeatureSheet(RectTransform parent)
    {
        var shadow = CreateGraphic("FeatureSheetShadow", parent, new Vector2(0f, 0f), new Vector2(1f, 0f), new Vector2(0f, ShellMetrics.BottomNavDp - ShellMetrics.Space2Dp), new Vector2(0f, ShellMetrics.BottomNavDp * 2f), ShellColorToken.Shadow, true);
        var sheet = CreateGraphic("FeatureSheet", shadow, FullMin, FullMax, new Vector2(0f, ShellMetrics.Space2Dp), Vector2.zero, ShellColorToken.Navy900, true);
        var handleHalfWidth = ShellMetrics.MinimumTargetDp * 2f + ShellMetrics.Space6Dp;
        var handle = CreateTarget("FeatureSheetPeek", sheet, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(-handleHalfWidth, -ShellMetrics.MinimumTargetDp * 0.5f), new Vector2(handleHalfWidth, ShellMetrics.MinimumTargetDp * 0.5f), ShellColorToken.Navy900);
        CreateGraphic("HandleLine", handle, new Vector2(0.5f, 0.72f), new Vector2(0.5f, 0.72f), new Vector2(-ShellMetrics.Space8Dp, -ShellMetrics.StrokeDefaultDp), new Vector2(ShellMetrics.Space8Dp, ShellMetrics.StrokeDefaultDp), ShellColorToken.Line, true);
        CreateText("FeatureSheetLabel", handle, ShellCopyKey.FeatureSheetPeek, ShellMetrics.TypeLabelSp, ShellColorToken.TextSecondary, FullMin, new Vector2(1f, 0.62f), Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
    }

    private static void CreateBottomNav(RectTransform parent)
    {
        var nav = CreateGraphic("BottomNav", parent, new Vector2(0f, 0f), new Vector2(1f, 0f), Vector2.zero, new Vector2(0f, ShellMetrics.BottomNavDp), ShellColorToken.Navy900, false);
        var keys = new[] { ShellCopyKey.NavGrowth, ShellCopyKey.NavSkills, ShellCopyKey.NavEquipment, ShellCopyKey.NavWorld, ShellCopyKey.NavStore };
        for (var index = 0; index < keys.Length; index++)
        {
            var item = CreateTarget($"NavDestination{index + 1}", nav, new Vector2(index / 5f, 0f), new Vector2((index + 1) / 5f, 1f), Vector2.zero, Vector2.zero, ShellColorToken.Navy900);
            var iconToken = index == 0 ? ShellColorToken.Teal500 : ShellColorToken.Line;
            var iconHalfSize = ShellMetrics.Space3Dp * 0.5f;
            var icon = CreateGraphic("ToolStarMark", item, new Vector2(0.5f, 0.68f), new Vector2(0.5f, 0.68f), Vector2.one * -iconHalfSize, Vector2.one * iconHalfSize, iconToken, false);
            icon.localRotation = Quaternion.Euler(0f, 0f, 45f);
            if (index == 0)
            {
                CreateGraphic("SelectedIndicator", item, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f),
                    new Vector2(-ShellMetrics.Space6Dp, ShellMetrics.Space1Dp), new Vector2(ShellMetrics.Space6Dp, ShellMetrics.Space1Dp + ShellMetrics.StrokeDefaultDp * 2f), ShellColorToken.Teal500, false);
            }
            CreateText("Label", item, keys[index], ShellMetrics.TypeLabelSp, index == 0 ? ShellColorToken.Teal500 : ShellColorToken.TextSecondary,
                new Vector2(0f, 0f), new Vector2(1f, 0.52f), Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
        }
    }

    private static RectTransform CreateTopBand(string name, RectTransform parent, float top, float height, ShellColorToken token)
    {
        return CreateGraphic(name, parent, new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, -top - height), new Vector2(0f, -top), token, false);
    }

    private static RectTransform CreateTarget(string name, Transform parent, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax, ShellColorToken token)
    {
        var target = CreateGraphic(name, parent, anchorMin, anchorMax, offsetMin, offsetMax, token, true);
        target.gameObject.AddComponent<ShellTouchTarget>();
        var button = target.gameObject.AddComponent<Button>();
        button.transition = Selectable.Transition.None;
        button.targetGraphic = target.GetComponentInChildren<Graphic>();
        button.targetGraphic.raycastTarget = true;
        return target;
    }

    private static RectTransform CreateGraphic(string name, Transform parent, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax, ShellColorToken token, bool rounded)
    {
        var rect = CreateRect(name, parent, anchorMin, anchorMax, offsetMin, offsetMax);
        if (rounded)
        {
            rect.gameObject.AddComponent<RoundedPlateGraphic>().Apply(token);
        }
        else
        {
            var graphic = rect.gameObject.AddComponent<Image>();
            graphic.raycastTarget = false;
            rect.gameObject.AddComponent<ShellTokenGraphic>().Apply(token);
        }
        return rect;
    }

    private static RectTransform CreateText(string name, Transform parent, ShellCopyKey key, float size, ShellColorToken token, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax, TextAnchor alignment)
    {
        var rect = CreateRect(name, parent, anchorMin, anchorMax, offsetMin, offsetMax);
        var text = rect.gameObject.AddComponent<Text>();
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        text.fontSize = Mathf.RoundToInt(size);
        text.alignment = alignment;
        text.raycastTarget = false;
        rect.gameObject.AddComponent<ShellTokenGraphic>().Apply(token);
        rect.gameObject.AddComponent<ShellLocalizedText>().Apply(key);
        return rect;
    }

    private static RectTransform CreateRect(string name, Transform parent, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax)
    {
        var gameObject = new GameObject(name, typeof(RectTransform));
        var rect = gameObject.GetComponent<RectTransform>();
        rect.SetParent(parent, false);
        rect.anchorMin = anchorMin;
        rect.anchorMax = anchorMax;
        rect.offsetMin = offsetMin;
        rect.offsetMax = offsetMax;
        return rect;
    }
}
#endif
