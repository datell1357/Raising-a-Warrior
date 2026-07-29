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
            Assert.That(ShellDesignTokens.Color(ShellColorToken.Void), Is.EqualTo(new Color32(0x07, 0x14, 0x21, 0xFF)));
            Assert.That(ShellDesignTokens.Color(ShellColorToken.Navy900), Is.EqualTo(new Color32(0x0C, 0x1C, 0x2A, 0xFF)));
            Assert.That(ShellDesignTokens.Color(ShellColorToken.Line), Is.EqualTo(new Color32(0x34, 0x52, 0x68, 0xFF)));
            Assert.That(ShellDesignTokens.Color(ShellColorToken.TextPrimary), Is.EqualTo(new Color32(0xF2, 0xF7, 0xF8, 0xFF)));
            Assert.That(ShellDesignTokens.Color(ShellColorToken.TextSecondary), Is.EqualTo(new Color32(0xA9, 0xBD, 0xC6, 0xFF)));
            Assert.That(ShellDesignTokens.Color(ShellColorToken.Teal500), Is.EqualTo(new Color32(0x2B, 0xCB, 0xBB, 0xFF)));
            Assert.That(ShellDesignTokens.Color(ShellColorToken.Ember500), Is.EqualTo(new Color32(0xF2, 0x8A, 0x45, 0xFF)));
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

            Assert.That(destinations, Has.Length.EqualTo(5));
            Assert.That(destinations[0].Find("SelectedIndicator"), Is.Not.Null);
            Assert.That(destinations.Skip(1).All(destination => destination.Find("SelectedIndicator") == null), Is.True);
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
            Assert.That(names, Does.Contain("StatusBar"));
            Assert.That(names, Does.Contain("QuestRibbon"));
            Assert.That(names, Does.Contain("CombatRegion"));
            Assert.That(names, Does.Contain("CombatViewportOverlay"));
            Assert.That(names, Does.Contain("FeatureSheet"));
            Assert.That(names, Does.Contain("BottomNav"));
            Assert.That(names.Count(name => name.StartsWith("QuickSlot")), Is.EqualTo(4));
            Assert.That(names.Count(name => name.StartsWith("NavDestination")), Is.EqualTo(5));
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
            Assert.That(copy.Value, Is.EqualTo("No active quest"));
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

        [TestCase(1080f, 2400f, 0.32f)]
        [TestCase(1080f, 2340f, 0.30f)]
        [TestCase(1080f, 1920f, 0.26f)]
        public void CombatLayout_whenTargetAspectUsed_preservesMinimumRegion(float width, float height, float minimumRatio)
        {
            var layout = ShellLayout.Calculate(new Vector2(width, height), ShellSheetState.Peek);

            Assert.That(layout.CombatHeight / height, Is.GreaterThanOrEqualTo(minimumRatio));
            Assert.That(layout.BottomNavHeight, Is.EqualTo(ShellMetrics.BottomNavDp));
            Assert.That(layout.FeatureSheetYieldsFirst, Is.True);
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
