using System;
using System.IO;
using UnityEditor;
using UnityEditor.AddressableAssets;
using UnityEditor.AddressableAssets.Settings;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class T6AndroidBuild
{
    private const string OutputPath = "android/build/WarriorRaising-dev.aab";
    private const string ReportPath = "android/build/build-report.json";
    private const string BootstrapScene = "Assets/Scenes/Bootstrap.unity";

    [Serializable]
    private sealed class BuildReportSummary
    {
        public string unityVersion;
        public string buildTarget;
        public string result;
        public string outputPath;
        public ulong totalSize;
        public double totalTimeSeconds;
    }

    public static void BuildDev()
    {
        T6ProjectConfigurator.Apply();
        L5AddressablesConfigurator.Apply();
        AssetDatabase.SaveAssets();
        AddressableAssetSettings.BuildPlayerContent(out var addressables);
        if (!string.IsNullOrEmpty(addressables.Error))
        {
            throw new BuildFailedException($"Addressables PAD build failed: {addressables.Error}");
        }

        Directory.CreateDirectory(Path.GetDirectoryName(OutputPath));
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes = new[] { BootstrapScene },
            locationPathName = OutputPath,
            target = BuildTarget.Android,
            options = BuildOptions.None,
        });

        File.WriteAllText(ReportPath, JsonUtility.ToJson(new BuildReportSummary
        {
            unityVersion = Application.unityVersion,
            buildTarget = report.summary.platform.ToString(),
            result = report.summary.result.ToString(),
            outputPath = report.summary.outputPath,
            totalSize = report.summary.totalSize,
            totalTimeSeconds = report.summary.totalTime.TotalSeconds,
        }, true));

        if (report.summary.result != BuildResult.Succeeded)
        {
            throw new BuildFailedException($"Android build failed: {report.summary.result}");
        }

        if (!File.Exists(OutputPath))
        {
            throw new BuildFailedException("Android build reported success without producing the AAB.");
        }
    }
}
