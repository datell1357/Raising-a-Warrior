#if UNITY_EDITOR
using System;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using Warrior.Presentation;

public static class SlayerShellSceneBuilder
{
    private const string ScenePath = "Assets/Scenes/Bootstrap.unity";
    private const string GeneratedRoot = "Assets/Warrior/Runtime/Presentation/Generated/";
    private static readonly Vector2 FullMin = Vector2.zero;
    private static readonly Vector2 FullMax = Vector2.one;

    [MenuItem("Warrior Raising/Build L5 Shell Scene")]
    public static void Build()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var canvas = CreateCanvas();
        var inputModule = Type.GetType("UnityEngine.InputSystem.UI.InputSystemUIInputModule, Unity.InputSystem", true);
        new GameObject("EventSystem", typeof(EventSystem), inputModule);
        CreateGraphic("Background", canvas.transform, FullMin, FullMax, Vector2.zero, Vector2.zero, ShellColorToken.Void, false);
        var safeArea = CreateRect("SafeAreaRoot", canvas.transform, FullMin, FullMax, Vector2.zero, Vector2.zero);
        safeArea.gameObject.AddComponent<SafeAreaRoot>().Configure(safeArea);
        safeArea.gameObject.AddComponent<ShellNavigationController>();

        CreateStatusBar(safeArea);
        CreateQuestRibbon(safeArea);
        CreateCombatRegion(safeArea);
        CreateQuickBar(safeArea);
        CreateFeatureSheet(safeArea);
        CreateBottomNav(safeArea);

        if (!AssetDatabase.IsValidFolder("Assets/Scenes")) AssetDatabase.CreateFolder("Assets", "Scenes");
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        AssetDatabase.SaveAssets();
    }

    private static Canvas CreateCanvas()
    {
        var cameraObject = new GameObject("ShellCamera", typeof(Camera));
        cameraObject.tag = "MainCamera";
        var camera = cameraObject.GetComponent<Camera>();
        camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = ShellDesignTokens.Color(ShellColorToken.Void);
        camera.orthographic = true;

        var canvasObject = new GameObject("ShellCanvas", typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
        var canvas = canvasObject.GetComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceCamera;
        canvas.worldCamera = camera;
        canvas.planeDistance = 1f;
        ShellCanvasDensity.Configure(canvasObject.GetComponent<CanvasScaler>());
        return canvas;
    }

    private static void CreateStatusBar(RectTransform parent)
    {
        var bar = Band("StatusBar", parent, 0f, ShellMetrics.StatusBarDp, ShellColorToken.Navy900);
        var avatar = CreateGraphic("ProfilePlate", bar, new Vector2(0f, 0f), new Vector2(0.17f, 1f), new Vector2(4f, 3f), new Vector2(-2f, -3f), ShellColorToken.Navy700, true);
        CreateText("AvatarMark", avatar, "V", 18f, ShellColorToken.Ember500, FullMin, FullMax, Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
        CreateLocalizedText("StatusTitle", bar, ShellCopyKey.StatusTitle, 11f, ShellColorToken.TextPrimary, new Vector2(0.18f, 0.46f), new Vector2(0.34f, 0.94f), Vector2.zero, Vector2.zero, TextAnchor.MiddleLeft);
        CreateLocalizedText("StatusSubtitle", bar, ShellCopyKey.StatusSubtitle, 8f, ShellColorToken.TextSecondary, new Vector2(0.18f, 0.06f), new Vector2(0.43f, 0.48f), Vector2.zero, Vector2.zero, TextAnchor.MiddleLeft);
        CreateResource("CoinResource", bar, ShellCopyKey.ResourceCoin, new Vector2(0.43f, 0.18f), new Vector2(0.61f, 0.82f), ShellColorToken.Ember500);
        CreateResource("AetherResource", bar, ShellCopyKey.ResourceAether, new Vector2(0.62f, 0.18f), new Vector2(0.80f, 0.82f), ShellColorToken.Teal500);
        CreateResource("LevelProgress", bar, ShellCopyKey.ResourceLevel, new Vector2(0.81f, 0.18f), new Vector2(0.94f, 0.82f), ShellColorToken.ResourceGreen);
        CreateText("Menu", bar, "≡", 20f, ShellColorToken.TextSecondary, new Vector2(0.94f, 0f), FullMax, Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
    }

    private static void CreateResource(string name, Transform parent, ShellCopyKey key, Vector2 min, Vector2 max, ShellColorToken accent)
    {
        var plate = CreateGraphic(name, parent, min, max, Vector2.zero, Vector2.zero, ShellColorToken.Navy800, true);
        CreateGraphic("Accent", plate, Vector2.zero, new Vector2(0.08f, 1f), Vector2.zero, Vector2.zero, accent, false);
        CreateLocalizedText("Value", plate, key, 9f, ShellColorToken.TextPrimary, new Vector2(0.1f, 0f), FullMax, Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
    }

    private static void CreateQuestRibbon(RectTransform parent)
    {
        var bar = Band("QuestRibbon", parent, ShellMetrics.StatusBarDp, ShellMetrics.QuestRibbonDp, ShellColorToken.Navy800);
        var primary = CreateLocalizedText("QuestPrimary", bar, ShellCopyKey.QuestEmpty, 11f, ShellColorToken.TextPrimary, new Vector2(0f, 0f), new Vector2(0.36f, 1f), new Vector2(10f, 0f), Vector2.zero, TextAnchor.MiddleLeft);
        primary.gameObject.AddComponent<AccountEntryPresenter>();
        CreateLocalizedText("QuestSecondary", bar, ShellCopyKey.QuestHint, 10f, ShellColorToken.TextPrimary, new Vector2(0.36f, 0f), new Vector2(0.82f, 1f), Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
        CreateLocalizedText("StageLabel", bar, ShellCopyKey.StageIdle, 8f, ShellColorToken.Ember500, new Vector2(0.82f, 0f), FullMax, Vector2.zero, new Vector2(-8f, 0f), TextAnchor.MiddleRight);
    }

    private static void CreateCombatRegion(RectTransform parent)
    {
        var top = ShellMetrics.StatusBarDp + ShellMetrics.QuestRibbonDp;
        var combat = CreateGraphic("CombatRegion", parent, new Vector2(0f, 0.55f), FullMax,
            new Vector2(0f, -top), new Vector2(0f, -top), ShellColorToken.Navy900, false);
        combat.gameObject.AddComponent<RectMask2D>();
        var backdrop = CreateRaw("CombatBackdrop", combat, FullMin, FullMax, Vector2.zero, Vector2.zero, "warrior-shell-combat-backdrop.png");
        backdrop.raycastTarget = false;
        var backdropRatio = backdrop.gameObject.AddComponent<AspectRatioFitter>();
        backdropRatio.aspectMode = AspectRatioFitter.AspectMode.EnvelopeParent;
        backdropRatio.aspectRatio = 1.5f;
        CreateGraphic("CombatViewportOverlay", combat, FullMin, FullMax, Vector2.zero, Vector2.zero, ShellColorToken.Rim, false).GetComponent<Image>().color = new Color32(0x08, 0x08, 0x0A, 0x18);
        var hero = CreateRaw("CombatHero", combat, new Vector2(0.34f, 0.27f), new Vector2(0.66f, 0.59f), Vector2.zero, Vector2.zero, "warrior-shell-hero.png");
        var heroRatio = hero.gameObject.AddComponent<AspectRatioFitter>();
        heroRatio.aspectMode = AspectRatioFitter.AspectMode.HeightControlsWidth;
        heroRatio.aspectRatio = 1f;
        CreateText("DamageNumber", combat, "12,480", 18f, ShellColorToken.TextPrimary, new Vector2(0.38f, 0.58f), new Vector2(0.62f, 0.72f), Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
        CreateBar("HealthBar", combat, new Vector2(0.33f, 0.20f), new Vector2(0.67f, 0.225f), ShellColorToken.ResourceGreen);
        CreateBar("ManaBar", combat, new Vector2(0.33f, 0.17f), new Vector2(0.67f, 0.195f), ShellColorToken.Teal500);
        CreateText("AutoBattle", combat, "AUTO", 9f, ShellColorToken.Ember500, new Vector2(0.84f, 0.02f), new Vector2(0.98f, 0.12f), Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
    }

    private static void CreateBar(string name, Transform parent, Vector2 min, Vector2 max, ShellColorToken fill)
    {
        var track = CreateGraphic(name, parent, min, max, Vector2.zero, Vector2.zero, ShellColorToken.Void, false);
        CreateGraphic("Fill", track, Vector2.zero, new Vector2(0.76f, 1f), Vector2.zero, Vector2.zero, fill, false);
    }

    private static void CreateQuickBar(RectTransform parent)
    {
        var top = ShellMetrics.StatusBarDp + ShellMetrics.QuestRibbonDp;
        var bar = CreateGraphic("QuickBar", parent, new Vector2(0f, 0.55f), new Vector2(1f, 0.55f),
            new Vector2(0f, -top - ShellMetrics.QuickBarDp), new Vector2(0f, -top), ShellColorToken.Void, false);
        for (var index = 0; index < 4; index++)
        {
            var min = new Vector2(0.04f + index * 0.19f, 0.12f);
            var max = new Vector2(0.21f + index * 0.19f, 0.88f);
            var slot = CreateTarget($"QuickSlot{index + 1}", bar, min, max, Vector2.zero, Vector2.zero, ShellColorToken.Navy700);
            var icon = CreateRaw("Icon", slot, new Vector2(0.08f, 0.08f), new Vector2(0.92f, 0.92f), Vector2.zero, Vector2.zero, "warrior-shell-skill-atlas.png");
            icon.uvRect = new Rect((index % 2) * 0.5f, index < 2 ? 0.5f : 0f, 0.5f, 0.5f);
            CreateText("Label", slot, $"{index + 1}", 9f, ShellColorToken.TextSecondary, new Vector2(0.7f, 0.68f), FullMax, Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
        }
        var auto = CreateGraphic("AutoControl", bar, new Vector2(0.82f, 0.12f), new Vector2(0.96f, 0.88f), Vector2.zero, Vector2.zero, ShellColorToken.Navy700, true);
        CreateText("Label", auto, "AUTO", 9f, ShellColorToken.Ember500, FullMin, FullMax, Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
    }

    private static void CreateFeatureSheet(RectTransform parent)
    {
        var topOffset = ShellMetrics.StatusBarDp + ShellMetrics.QuestRibbonDp + ShellMetrics.QuickBarDp;
        var sheet = CreateGraphic("FeatureSheet", parent, FullMin, new Vector2(1f, 0.55f),
            new Vector2(0f, ShellMetrics.BottomNavDp), new Vector2(0f, -topOffset), ShellColorToken.Navy900, false);
        sheet.gameObject.AddComponent<RectMask2D>();
        var ornament = CreateRaw("PanelOrnament", sheet, FullMin, FullMax, Vector2.zero, Vector2.zero, "warrior-shell-panel-ornament.png");
        ornament.color = new Color(1f, 1f, 1f, 0.24f);
        var ornamentRatio = ornament.gameObject.AddComponent<AspectRatioFitter>();
        ornamentRatio.aspectMode = AspectRatioFitter.AspectMode.EnvelopeParent;
        ornamentRatio.aspectRatio = 1f;
        var viewport = CreateRect("Viewport", sheet, FullMin, FullMax, new Vector2(6f, 6f), new Vector2(-6f, -6f));
        viewport.gameObject.AddComponent<Image>().color = Color.white;
        viewport.gameObject.AddComponent<Mask>().showMaskGraphic = false;
        var content = CreateRect("Content", viewport, new Vector2(0f, 1f), FullMax,
            new Vector2(0f, -ShellMetrics.FeaturePanelDp), Vector2.zero);
        var scroll = sheet.gameObject.AddComponent<ScrollRect>();
        scroll.viewport = viewport;
        scroll.content = content;
        scroll.horizontal = false;
        scroll.vertical = true;
        var panelKeys = new[] { ShellCopyKey.PanelGrowth, ShellCopyKey.PanelSkills, ShellCopyKey.PanelGear, ShellCopyKey.PanelWorld, ShellCopyKey.PanelStore, ShellCopyKey.PanelSummon };
        var names = new[] { "GrowthPanel", "SkillPanel", "GearPanel", "WorldPanel", "StorePanel", "SummonPanel" };
        for (var index = 0; index < names.Length; index++) CreatePanel(names[index], content, panelKeys[index], index, index == 0);
    }

    private static void CreatePanel(string name, Transform parent, ShellCopyKey key, int panelIndex, bool active)
    {
        var titleSets = new[]
        {
            new[] { "Power", "Vitality", "Aether" },
            new[] { "Comet Slash", "Forge Eruption", "Gravity Seal" },
            new[] { "Aether Blade", "Bronze Armor", "Star Ring" },
            new[] { "Celestial Grove", "Ruin Gate", "Ember Vault" },
            new[] { "Daily Cache", "Aether Pack", "Forge Pass" },
            new[] { "Warrior Draw", "Skill Draw", "Gear Draw" }
        };
        var valueSets = new[]
        {
            new[] { "20 → 21", "25 → 26", "30 → 31" },
            new[] { "LV. 4", "LV. 3", "LV. 2" },
            new[] { "+12", "+8", "+6" },
            new[] { "4 - 6", "LOCKED", "LOCKED" },
            new[] { "FREE", "900", "2,400" },
            new[] { "1", "10", "10" }
        };
        var actions = new[] { "LEVEL UP", "EQUIP", "FORGE", "ENTER", "CLAIM", "SUMMON" };
        var panel = CreateRect(name, parent, FullMin, FullMax, Vector2.zero, Vector2.zero);
        CreateLocalizedText("PanelTitle", panel, key, 14f, ShellColorToken.TextPrimary, new Vector2(0f, 0.84f), new Vector2(0.5f, 1f), new Vector2(10f, 0f), Vector2.zero, TextAnchor.MiddleLeft);
        for (var row = 0; row < 3; row++)
        {
            var item = CreateGraphic($"UpgradeRow{row + 1}", panel, new Vector2(0.03f, 0.63f - row * 0.22f), new Vector2(0.97f, 0.83f - row * 0.22f), Vector2.zero, Vector2.zero, ShellColorToken.Navy800, true);
            CreateText("Title", item, titleSets[panelIndex][row], 10f, ShellColorToken.TextPrimary, new Vector2(0.05f, 0f), new Vector2(0.42f, 1f), Vector2.zero, Vector2.zero, TextAnchor.MiddleLeft);
            CreateText("Value", item, valueSets[panelIndex][row], 9f, ShellColorToken.TextSecondary, new Vector2(0.42f, 0f), new Vector2(0.7f, 1f), Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
            var action = CreateGraphic("UpgradeAction", item, new Vector2(0.72f, 0.14f), new Vector2(0.97f, 0.86f), Vector2.zero, Vector2.zero, ShellColorToken.Ember500, true);
            CreateText("Label", action, actions[panelIndex], 8f, ShellColorToken.Void, FullMin, FullMax, Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
        }
        panel.gameObject.SetActive(active);
    }

    private static void CreateBottomNav(RectTransform parent)
    {
        var nav = CreateGraphic("BottomNav", parent, FullMin, new Vector2(1f, 0f),
            Vector2.zero, new Vector2(0f, ShellMetrics.BottomNavDp), ShellColorToken.Navy900, false);
        var keys = new[] { ShellCopyKey.NavGrowth, ShellCopyKey.NavSkills, ShellCopyKey.NavEquipment, ShellCopyKey.NavWorld, ShellCopyKey.NavStore, ShellCopyKey.NavSummon };
        for (var index = 0; index < keys.Length; index++)
        {
            var item = CreateTarget($"NavDestination{index + 1}", nav, new Vector2(index / 6f, 0f), new Vector2((index + 1) / 6f, 1f), Vector2.zero, Vector2.zero, ShellColorToken.Navy900);
            var icon = CreateGraphic("NavIcon", item, new Vector2(0.5f, 0.62f), new Vector2(0.5f, 0.62f), new Vector2(-7f, -7f), new Vector2(7f, 7f), index == 0 ? ShellColorToken.Ember500 : ShellColorToken.Line, false);
            icon.localRotation = Quaternion.Euler(0f, 0f, 45f);
            CreateLocalizedText("Label", item, keys[index], 8f, index == 0 ? ShellColorToken.Ember500 : ShellColorToken.TextSecondary, new Vector2(0f, 0f), new Vector2(1f, 0.48f), Vector2.zero, Vector2.zero, TextAnchor.MiddleCenter);
            if (index == 0) CreateGraphic("SelectedIndicator", item, new Vector2(0f, 0f), new Vector2(1f, 0f), new Vector2(8f, 4f), new Vector2(-8f, 7f), ShellColorToken.Ember500, false);
        }
    }

    private static RectTransform Band(string name, Transform parent, float top, float height, ShellColorToken token) =>
        CreateGraphic(name, parent, new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, -top - height), new Vector2(0f, -top), token, false);

    private static RectTransform CreateTarget(string name, Transform parent, Vector2 min, Vector2 max, Vector2 offsetMin, Vector2 offsetMax, ShellColorToken token)
    {
        var target = CreateGraphic(name, parent, min, max, offsetMin, offsetMax, token, true);
        target.gameObject.AddComponent<ShellTouchTarget>();
        var button = target.gameObject.AddComponent<Button>();
        button.transition = Selectable.Transition.None;
        button.targetGraphic = target.GetComponentInChildren<Graphic>();
        button.targetGraphic.raycastTarget = true;
        return target;
    }

    private static RectTransform CreateGraphic(string name, Transform parent, Vector2 min, Vector2 max, Vector2 offsetMin, Vector2 offsetMax, ShellColorToken token, bool rounded)
    {
        var rect = CreateRect(name, parent, min, max, offsetMin, offsetMax);
        if (rounded) rect.gameObject.AddComponent<RoundedPlateGraphic>().Apply(token);
        else
        {
            rect.gameObject.AddComponent<Image>().raycastTarget = false;
            rect.gameObject.AddComponent<ShellTokenGraphic>().Apply(token);
        }
        return rect;
    }

    private static RawImage CreateRaw(string name, Transform parent, Vector2 min, Vector2 max, Vector2 offsetMin, Vector2 offsetMax, string asset)
    {
        var rect = CreateRect(name, parent, min, max, offsetMin, offsetMax);
        var raw = rect.gameObject.AddComponent<RawImage>();
        raw.texture = AssetDatabase.LoadAssetAtPath<Texture2D>($"{GeneratedRoot}{asset}");
        return raw;
    }

    private static RectTransform CreateLocalizedText(string name, Transform parent, ShellCopyKey key, float size, ShellColorToken token, Vector2 min, Vector2 max, Vector2 offsetMin, Vector2 offsetMax, TextAnchor alignment)
    {
        var rect = CreateText(name, parent, string.Empty, size, token, min, max, offsetMin, offsetMax, alignment);
        rect.gameObject.AddComponent<ShellLocalizedText>().Apply(key);
        return rect;
    }

    private static RectTransform CreateText(string name, Transform parent, string value, float size, ShellColorToken token, Vector2 min, Vector2 max, Vector2 offsetMin, Vector2 offsetMax, TextAnchor alignment)
    {
        var rect = CreateRect(name, parent, min, max, offsetMin, offsetMax);
        var text = rect.gameObject.AddComponent<Text>();
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        text.fontSize = Mathf.RoundToInt(size);
        text.alignment = alignment;
        text.text = value;
        text.raycastTarget = false;
        rect.gameObject.AddComponent<ShellTokenGraphic>().Apply(token);
        return rect;
    }

    private static RectTransform CreateRect(string name, Transform parent, Vector2 min, Vector2 max, Vector2 offsetMin, Vector2 offsetMax)
    {
        var rect = new GameObject(name, typeof(RectTransform)).GetComponent<RectTransform>();
        rect.SetParent(parent, false);
        rect.anchorMin = min;
        rect.anchorMax = max;
        rect.offsetMin = offsetMin;
        rect.offsetMax = offsetMax;
        return rect;
    }
}
#endif
