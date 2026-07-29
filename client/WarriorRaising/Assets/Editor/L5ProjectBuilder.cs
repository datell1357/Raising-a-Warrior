using System;
using UnityEditor;

public static class L5ProjectBuilder
{
    private const string ShellSceneBuildMenu = "Warrior Raising/Build L5 Shell Scene";

    [MenuItem("Warrior Raising/Build L5 Shell")]
    public static void Build()
    {
        T6ProjectConfigurator.Apply();
        L5AddressablesConfigurator.Apply();
        if (!EditorApplication.ExecuteMenuItem(ShellSceneBuildMenu))
        {
            throw new InvalidOperationException("L5 shell scene builder menu command is unavailable.");
        }
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        AssetDatabase.SaveAssets();
    }
}
