using UnityEditor;
using UnityEditor.Build;
#if UNITY_ANDROID
using Unity.Android.Types;
#endif
using UnityEngine;

[InitializeOnLoad]
public static class T6ProjectConfigurator
{
    private const string AndroidApplicationIdentifier = "com.warriorraising.dev";

#if UNITY_ANDROID
    private static readonly DebugSymbolFormat AndroidDebugSymbolFormats =
        DebugSymbolFormat.Zip | DebugSymbolFormat.IncludeInBundle;
#endif

    static T6ProjectConfigurator()
    {
#if UNITY_ANDROID
        Apply();
#endif
    }

    [MenuItem("Warrior Raising/Apply T6 Project Configuration")]
    public static void Apply()
    {
#if !UNITY_ANDROID
        throw new BuildFailedException("T6 project configuration requires the Android build target.");
#else
        var changed = false;

        changed |= SetApplicationIdentifier();
        changed |= SetScriptingBackend();
        changed |= SetMinimumSdkVersion();
        changed |= SetTargetSdkVersion();
        changed |= SetArchitectures();
        changed |= SetPortraitOrientation();
        changed |= SetSplitApplicationBinary();
        changed |= DisableCustomKeystore();
        changed |= SetAppBundleOutput();
        changed |= SetDebugSymbols();

        if (changed)
        {
            AssetDatabase.SaveAssets();
            Debug.Log("T6 project configuration applied.");
        }
        else
        {
            Debug.Log("T6 project configuration already current.");
        }
#endif
    }

#if UNITY_ANDROID
    private static bool SetApplicationIdentifier()
    {
        if (PlayerSettings.GetApplicationIdentifier(NamedBuildTarget.Android) == AndroidApplicationIdentifier)
        {
            return false;
        }

        PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, AndroidApplicationIdentifier);
        return true;
    }

    private static bool SetScriptingBackend()
    {
        if (PlayerSettings.GetScriptingBackend(NamedBuildTarget.Android) == ScriptingImplementation.IL2CPP)
        {
            return false;
        }

        PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
        return true;
    }

    private static bool SetMinimumSdkVersion()
    {
        if (PlayerSettings.Android.minSdkVersion == AndroidSdkVersions.AndroidApiLevel28)
        {
            return false;
        }

        PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel28;
        return true;
    }

    private static bool SetTargetSdkVersion()
    {
        if (PlayerSettings.Android.targetSdkVersion == AndroidSdkVersions.AndroidApiLevel36)
        {
            return false;
        }

        PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevel36;
        return true;
    }

    private static bool SetArchitectures()
    {
        if (PlayerSettings.Android.targetArchitectures == UnityEditor.AndroidArchitecture.ARM64)
        {
            return false;
        }

        PlayerSettings.Android.targetArchitectures = UnityEditor.AndroidArchitecture.ARM64;
        return true;
    }

    private static bool SetPortraitOrientation()
    {
        if (PlayerSettings.defaultInterfaceOrientation == UIOrientation.Portrait)
        {
            return false;
        }

        PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
        return true;
    }

    private static bool SetSplitApplicationBinary()
    {
        if (PlayerSettings.Android.splitApplicationBinary)
        {
            return false;
        }

        PlayerSettings.Android.splitApplicationBinary = true;
        return true;
    }

    private static bool DisableCustomKeystore()
    {
        if (!PlayerSettings.Android.useCustomKeystore)
        {
            return false;
        }

        PlayerSettings.Android.useCustomKeystore = false;
        return true;
    }

    private static bool SetAppBundleOutput()
    {
        if (EditorUserBuildSettings.buildAppBundle)
        {
            return false;
        }

        EditorUserBuildSettings.buildAppBundle = true;
        return true;
    }

    private static bool SetDebugSymbols()
    {
        var changed = false;

        if (UnityEditor.Android.UserBuildSettings.DebugSymbols.level != DebugSymbolLevel.SymbolTable)
        {
            UnityEditor.Android.UserBuildSettings.DebugSymbols.level = DebugSymbolLevel.SymbolTable;
            changed = true;
        }

        if (UnityEditor.Android.UserBuildSettings.DebugSymbols.format != AndroidDebugSymbolFormats)
        {
            UnityEditor.Android.UserBuildSettings.DebugSymbols.format = AndroidDebugSymbolFormats;
            changed = true;
        }

        return changed;
    }
#endif
}
