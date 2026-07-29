using System;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Warrior.Presentation;

namespace Warrior.Tests.EditMode
{
    public sealed class L5ShellContractTests
    {
        private const string BootstrapScene = "Assets/Scenes/Bootstrap.unity";

        [Test]
        public void SafeAreaMath_whenInsetsProvided_convertsEachEdgeToAnchorsOnce()
        {
            var anchors = SafeAreaMath.ToAnchors(new Rect(24f, 96f, 1032f, 2208f), new Vector2(1080f, 2400f));

            Assert.That(anchors.Minimum, Is.EqualTo(new Vector2(24f / 1080f, 96f / 2400f)));
            Assert.That(anchors.Maximum, Is.EqualTo(new Vector2(1056f / 1080f, 2304f / 2400f)));
        }

        [Test]
        public void ShellReadiness_whenTargetDimensionsProvided_formatsMachineMarkerContract()
        {
            Assert.That(ShellReadiness.Marker(1080, 2340), Is.EqualTo("T6_SHELL_READY width=1080 height=2340"));
        }

        [Test]
        public void ShellTargets_whenSceneLoaded_areAtLeastFortyEightDp()
        {
            var scene = EditorSceneManager.OpenScene(BootstrapScene, OpenSceneMode.Single);

            var targets = scene.GetRootGameObjects().SelectMany(root => root.GetComponentsInChildren<ShellTouchTarget>(true));

            Assert.That(targets, Is.Not.Empty);
            Assert.That(targets.All(target => target.MinimumSizeDp >= ShellMetrics.MinimumTargetDp), Is.True);
            Assert.That(ShellMetrics.MinimumTargetDp, Is.EqualTo(48f));
        }

        [Test]
        public void ShellTokenMap_whenQueried_matchesDesignContract()
        {
            Assert.That(ShellDesignTokens.Color(ShellColorToken.Void), Is.EqualTo(new Color32(0x09, 0x06, 0x04, 0xFF)));
            Assert.That(ShellDesignTokens.Color(ShellColorToken.Navy900), Is.EqualTo(new Color32(0x17, 0x11, 0x0E, 0xFF)));
            Assert.That(ShellDesignTokens.Color(ShellColorToken.Line), Is.EqualTo(new Color32(0x6B, 0x4A, 0x2E, 0xFF)));
            Assert.That(ShellDesignTokens.Color(ShellColorToken.TextPrimary), Is.EqualTo(new Color32(0xF7, 0xF1, 0xE8, 0xFF)));
            Assert.That(ShellDesignTokens.Color(ShellColorToken.TextSecondary), Is.EqualTo(new Color32(0xC8, 0xBB, 0xA8, 0xFF)));
            Assert.That(ShellDesignTokens.Color(ShellColorToken.Teal500), Is.EqualTo(new Color32(0x17, 0xC8, 0xE6, 0xFF)));
            Assert.That(ShellDesignTokens.Color(ShellColorToken.Ember500), Is.EqualTo(new Color32(0xF5, 0xA6, 0x23, 0xFF)));
        }

        [Test]
        public void ShellCanvas_whenSceneLoaded_usesThreeHundredSixtyDpWidth()
        {
            var scene = EditorSceneManager.OpenScene(BootstrapScene, OpenSceneMode.Single);
            var scaler = scene.GetRootGameObjects()
                .SelectMany(root => root.GetComponentsInChildren<CanvasScaler>(true))
                .Single();

            Assert.That(scaler.referenceResolution, Is.EqualTo(new Vector2(360f, 800f)));
            Assert.That(scaler.screenMatchMode, Is.EqualTo(CanvasScaler.ScreenMatchMode.MatchWidthOrHeight));
            Assert.That(scaler.matchWidthOrHeight, Is.Zero);
        }

        [Test]
        public void QuickSlotLabels_whenSceneLoaded_meetNormalTextContrastFloor()
        {
            var scene = EditorSceneManager.OpenScene(BootstrapScene, OpenSceneMode.Single);
            var labels = scene.GetRootGameObjects()
                .SelectMany(root => root.GetComponentsInChildren<Transform>(true))
                .Where(transform => transform.name == "Label" && transform.parent.name.StartsWith("QuickSlot"))
                .Select(transform => transform.GetComponent<Text>())
                .ToArray();

            Assert.That(labels, Has.Length.EqualTo(4));
            Assert.That(labels.All(label => ContrastRatio(label.color, ShellDesignTokens.Color(ShellColorToken.Navy700)) >= 4.5f), Is.True);
        }

        [Test]
        public void BottomNav_whenSceneLoaded_marksSelectionWithGeometry()
        {
            var scene = EditorSceneManager.OpenScene(BootstrapScene, OpenSceneMode.Single);
            var destinations = scene.GetRootGameObjects()
                .SelectMany(root => root.GetComponentsInChildren<Transform>(true))
                .Where(transform => transform.name.StartsWith("NavDestination"))
                .OrderBy(transform => transform.name)
                .ToArray();

            Assert.That(destinations, Has.Length.EqualTo(6));
            Assert.That(destinations[0].Find("SelectedIndicator"), Is.Not.Null);
            Assert.That(destinations.Skip(1).All(destination => destination.Find("SelectedIndicator") == null), Is.True);

            var controller = scene.GetRootGameObjects()
                .SelectMany(root => root.GetComponentsInChildren<ShellNavigationController>(true))
                .Single();
            controller.Select(1);

            Assert.That(destinations[1].Find("SelectedIndicator"), Is.Not.Null);
            Assert.That(destinations[0].Find("SelectedIndicator"), Is.Null);
            Assert.That((Color32)destinations[1].Find("Label").GetComponent<Text>().color, Is.EqualTo((Color32)ShellDesignTokens.Color(ShellColorToken.Ember500)));
            Assert.That((Color32)destinations[0].Find("Label").GetComponent<Text>().color, Is.EqualTo((Color32)ShellDesignTokens.Color(ShellColorToken.TextSecondary)));
            Assert.That(controller.transform.Find("FeatureSheet/Viewport/Content/SkillPanel").gameObject.activeSelf, Is.True);
            Assert.That(controller.transform.Find("FeatureSheet/Viewport/Content/GrowthPanel").gameObject.activeSelf, Is.False);
            Assert.Throws<ArgumentOutOfRangeException>(() => controller.Select(6));

            var panelNames = new[] { "GrowthPanel", "SkillPanel", "GearPanel", "WorldPanel", "StorePanel", "SummonPanel" };
            var firstRowTitles = panelNames.Select((panelName, index) =>
            {
                controller.Select(index);
                return controller.transform.Find($"FeatureSheet/Viewport/Content/{panelName}/UpgradeRow1/Title")
                    .GetComponent<Text>()
                    .text;
            }).ToArray();

            Assert.That(firstRowTitles.Distinct().Count(), Is.EqualTo(6));
        }

        [Test]
        public void RoundedPlates_whenSceneLoaded_haveReusableDepthLayers()
        {
            var scene = EditorSceneManager.OpenScene(BootstrapScene, OpenSceneMode.Single);
            var plates = scene.GetRootGameObjects()
                .SelectMany(root => root.GetComponentsInChildren<RoundedPlateGraphic>(true))
                .ToArray();

            Assert.That(plates, Is.Not.Empty);
            Assert.That(plates.All(plate => plate.transform.Find("PlateRim") != null), Is.True);
            Assert.That(plates.All(plate => plate.transform.Find("PlateEngraving") != null), Is.True);
        }

        [Test]
        public void BootstrapScene_whenLoaded_hasRequiredLiveHierarchy()
        {
            var scene = EditorSceneManager.OpenScene(BootstrapScene, OpenSceneMode.Single);
            var names = scene.GetRootGameObjects()
                .SelectMany(root => root.GetComponentsInChildren<Transform>(true))
                .Select(transform => transform.name)
                .ToArray();

            Assert.That(names, Does.Contain("SafeAreaRoot"));
            Assert.That(names, Does.Contain("EventSystem"));
            Assert.That(names, Does.Contain("StatusBar"));
            Assert.That(names, Does.Contain("QuestRibbon"));
            Assert.That(names, Does.Contain("CombatRegion"));
            Assert.That(names, Does.Contain("CombatViewportOverlay"));
            Assert.That(names, Does.Contain("CombatBackdrop"));
            Assert.That(names, Does.Contain("CombatHero"));
            Assert.That(names, Does.Contain("CoinResource"));
            Assert.That(names, Does.Contain("AetherResource"));
            Assert.That(names, Does.Contain("LevelProgress"));
            Assert.That(names, Does.Contain("FeatureSheet"));
            Assert.That(names, Does.Contain("Viewport"));
            Assert.That(names, Does.Contain("Content"));
            Assert.That(names, Does.Contain("BottomNav"));
            Assert.That(names.Count(name => name.StartsWith("QuickSlot")), Is.EqualTo(4));
            Assert.That(names.Count(name => name.StartsWith("NavDestination")), Is.EqualTo(6));
            var scroll = scene.GetRootGameObjects().SelectMany(root => root.GetComponentsInChildren<ScrollRect>(true)).Single();
            Assert.That(scroll.vertical, Is.True);
            Assert.That(scroll.horizontal, Is.False);
            Assert.That(scroll.content.sizeDelta.y, Is.EqualTo(ShellMetrics.FeaturePanelDp));
            Assert.That(scroll.viewport.GetComponent<Image>().color.a, Is.GreaterThan(0f));
            Assert.That(scroll.content.Find("GrowthPanel/UpgradeRow1").GetComponent<RectTransform>().anchorMax.y, Is.GreaterThanOrEqualTo(0.83f));
            var eventSystem = scene.GetRootGameObjects()
                .SelectMany(root => root.GetComponentsInChildren<Transform>(true))
                .Single(transform => transform.name == "EventSystem");
            Assert.That(eventSystem.GetComponents<Component>().Any(component => component.GetType().Name == "InputSystemUIInputModule"), Is.True);

            var combat = scene.GetRootGameObjects()
                .SelectMany(root => root.GetComponentsInChildren<Transform>(true))
                .Single(transform => transform.name == "CombatRegion")
                .GetComponent<RectTransform>();
            var navigation = scene.GetRootGameObjects()
                .SelectMany(root => root.GetComponentsInChildren<Transform>(true))
                .Single(transform => transform.name == "BottomNav")
                .GetComponent<RectTransform>();

            Assert.That(combat.anchorMin.y, Is.EqualTo(0.55f));
            Assert.That(combat.anchorMax.y, Is.EqualTo(1f));
            Assert.That(combat.offsetMin.y, Is.EqualTo(-ShellMetrics.StatusBarDp - ShellMetrics.QuestRibbonDp));
            Assert.That(combat.offsetMax.y, Is.EqualTo(-ShellMetrics.StatusBarDp - ShellMetrics.QuestRibbonDp));
            Assert.That(navigation.anchorMin.y, Is.Zero);
            Assert.That(navigation.anchorMax.y, Is.Zero);
            Assert.That(navigation.offsetMin.y, Is.Zero);
            Assert.That(navigation.offsetMax.y, Is.EqualTo(ShellMetrics.BottomNavDp));
        }

        [Test]
        public void BootstrapScene_whenLoaded_hasNoMissingScripts()
        {
            var scene = EditorSceneManager.OpenScene(BootstrapScene, OpenSceneMode.Single);
            var missing = scene.GetRootGameObjects()
                .SelectMany(root => root.GetComponentsInChildren<Transform>(true))
                .Sum(transform => GameObjectUtility.GetMonoBehavioursWithMissingScriptCount(transform.gameObject));

            Assert.That(missing, Is.Zero);
        }

        [Test]
        public void ShellCopyCatalog_whenLocaleUnavailable_returnsExplicitEnglishFallback()
        {
            var copy = ShellCopyCatalog.Resolve("ko", ShellCopyKey.QuestEmpty);

            Assert.That(copy.RequestedLocale, Is.EqualTo("ko"));
            Assert.That(copy.ResolvedLocale, Is.EqualTo("en"));
            Assert.That(copy.Value, Is.EqualTo("Guest active"));
            Assert.That(copy.UsedFallback, Is.True);
        }

        [Test]
        public void Addressables_whenConfigured_hasExactInstallTimeContentGroup()
        {
            var projectRoot = Directory.GetParent(UnityEngine.Application.dataPath).FullName;
            var settings = File.ReadAllText(Path.Combine(projectRoot, "Assets", "AddressableAssetsData", "AddressableAssetSettings.asset"));
            var groups = Directory.GetFiles(Path.Combine(projectRoot, "Assets", "AddressableAssetsData", "AssetGroups"), "*.asset");
            var group = File.ReadAllText(groups.Single());
            var schema = File.ReadAllText(Directory.GetFiles(Path.Combine(projectRoot, "Assets", "AddressableAssetsData", "AssetGroups", "Schemas"), "*.asset").Single(path => File.ReadAllText(path).Contains("PlayAssetDeliverySchema")));

            Assert.That(settings, Does.Contain("AddressableAssetSettings"));
            Assert.That(groups, Has.Length.EqualTo(1));
            Assert.That(group, Does.Contain("m_Name: content"));
            Assert.That(schema, Does.Contain("m_AssetPackDeliveryType: 1"));
        }

        [Test]
        public void PadManifest_whenRead_matchesAddressablesGroupExactly()
        {
            var projectRoot = Directory.GetParent(UnityEngine.Application.dataPath).FullName;
            var manifest = File.ReadAllText(Path.Combine(projectRoot, "android", "pad", "manifest.json"));

            Assert.That(manifest.Replace(" ", string.Empty).Replace("\n", string.Empty),
                Is.EqualTo("{\"groups\":[{\"name\":\"content\",\"deliveryType\":\"install-time\"}]}"));
        }

        [TestCase(1080f, 2400f)]
        [TestCase(1080f, 2340f)]
        [TestCase(1080f, 1920f)]
        public void CombatLayout_whenTargetAspectUsed_reservesExactFortyFivePercent(float width, float height)
        {
            var layout = ShellLayout.Calculate(new Vector2(width, height), ShellSheetState.Peek);
            var adjustedSafeArea = SafeAreaMath.WithBottomInset(new Rect(0f, 0f, width, height), 84f);

            Assert.That(layout.CombatHeight / height, Is.EqualTo(0.45f).Within(0.001f));
            Assert.That(layout.BottomNavHeight, Is.EqualTo(ShellMetrics.BottomNavDp));
            Assert.That(layout.FeatureSheetYieldsFirst, Is.True);
            Assert.That(adjustedSafeArea.yMin, Is.EqualTo(84f));
            Assert.That(adjustedSafeArea.height, Is.EqualTo(height - 84f));
        }

        private static float ContrastRatio(Color foreground, Color background)
        {
            var foregroundLuminance = RelativeLuminance(foreground);
            var backgroundLuminance = RelativeLuminance(background);
            var lighter = Mathf.Max(foregroundLuminance, backgroundLuminance);
            var darker = Mathf.Min(foregroundLuminance, backgroundLuminance);
            return (lighter + 0.05f) / (darker + 0.05f);
        }

        private static float RelativeLuminance(Color color)
        {
            return 0.2126f * Linearize(color.r) + 0.7152f * Linearize(color.g) + 0.0722f * Linearize(color.b);
        }

        private static float Linearize(float component)
        {
            return component <= 0.03928f
                ? component / 12.92f
                : Mathf.Pow((component + 0.055f) / 1.055f, 2.4f);
        }
    }
}
