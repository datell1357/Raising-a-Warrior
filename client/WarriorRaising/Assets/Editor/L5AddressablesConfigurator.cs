using System;
using System.Linq;
using UnityEditor;
using UnityEditor.AddressableAssets;
using UnityEditor.AddressableAssets.Android;
using UnityEditor.AddressableAssets.Settings;
using UnityEditor.AddressableAssets.Settings.GroupSchemas;
using UnityEngine;
using UnityEngine.AddressableAssets.Android;

public static class L5AddressablesConfigurator
{
    private const string ConfigFolder = "Assets/AddressableAssetsData";
    private const string ConfigName = "AddressableAssetSettings";
    private const string ContentGroup = "content";

    public static void Apply()
    {
        var settings = AddressableAssetSettingsDefaultObject.Settings;
        if (settings == null)
        {
            settings = AddressableAssetSettings.Create(ConfigFolder, ConfigName, false, true);
        }

        if (AddressableAssetSettingsDefaultObject.Settings != settings)
        {
            AddressableAssetSettingsDefaultObject.Settings = settings;
        }

        var groups = settings.groups.Where(group => group != null).ToArray();
        if (groups.Length > 1 || (groups.Length == 1 && groups[0].Name != ContentGroup))
        {
            throw new InvalidOperationException("L5 Addressables settings must contain only the content group.");
        }

        var content = settings.FindGroup(ContentGroup) ?? settings.CreateGroup(
            ContentGroup,
            true,
            false,
            false,
            null,
            typeof(BundledAssetGroupSchema),
            typeof(PlayAssetDeliverySchema));

        var bundled = content.GetSchema<BundledAssetGroupSchema>();
        bundled.BuildPath.SetVariableByName(settings, AddressableAssetSettings.kLocalBuildPath);
        bundled.LoadPath.SetVariableByName(settings, AddressableAssetSettings.kLocalLoadPath);
        bundled.BundleMode = BundledAssetGroupSchema.BundlePackingMode.PackTogether;
        bundled.Compression = BundledAssetGroupSchema.BundleCompressionMode.LZ4;

        var pad = content.GetSchema<PlayAssetDeliverySchema>();
        pad.AssetPackDeliveryType = DeliveryType.InstallTime;
        pad.IncludeInCustomAssetPack = false;
        pad.CustomAssetPackName = string.Empty;

        AddAndroidInitialization(settings);
        settings.DefaultGroup = content;
        EditorUtility.SetDirty(settings);
        EditorUtility.SetDirty(content);
        AssetDatabase.SaveAssets();
    }

    private static void AddAndroidInitialization(AddressableAssetSettings settings)
    {
        var initialization = LoadOrCreate<PlayAssetDeliveryInitializationSettings>("InitObjects");
        if (!settings.InitializationObjects.Contains(initialization)) settings.AddInitializationObject(initialization);

        var builder = LoadOrCreate<BuildScriptPlayAssetDelivery>("DataBuilders");
        if (!settings.DataBuilders.Contains(builder)) settings.AddDataBuilder(builder);
        settings.ActivePlayerDataBuilderIndex = settings.DataBuilders.IndexOf(builder);
    }

    private static T LoadOrCreate<T>(string folder) where T : ScriptableObject
    {
        var directory = $"{ConfigFolder}/Android/{folder}";
        System.IO.Directory.CreateDirectory(directory);
        var path = $"{directory}/{typeof(T).Name}.asset";
        var asset = AssetDatabase.LoadAssetAtPath<T>(path);
        if (asset != null) return asset;
        AssetDatabase.CreateAsset(ScriptableObject.CreateInstance<T>(), path);
        return AssetDatabase.LoadAssetAtPath<T>(path);
    }
}
