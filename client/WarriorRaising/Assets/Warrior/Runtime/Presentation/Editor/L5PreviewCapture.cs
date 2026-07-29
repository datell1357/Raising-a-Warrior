#if UNITY_EDITOR
using System;
using System.IO;
using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Warrior.Presentation;

public static class L5PreviewCapture
{
    private const string ScenePath = "Assets/Scenes/Bootstrap.unity";

    [MenuItem("Warrior Raising/Capture L5 Previews")]
    public static void CaptureAll()
    {
        var projectRoot = Directory.GetParent(UnityEngine.Application.dataPath).FullName;
        var repositoryRoot = Path.GetFullPath(Path.Combine(projectRoot, "..", ".."));
        var evidenceRoot = Path.Combine(repositoryRoot, ".omo", "evidence", "implementation", "local-20260728", "mvp-t6", "a1", "task-6", "lanes", "l5");
        Directory.CreateDirectory(evidenceRoot);
        var captures = new[]
        {
            Capture(evidenceRoot, "preview-20x9.png", 1080, 2400),
            Capture(evidenceRoot, "preview-19_5x9.png", 1080, 2340),
            Capture(evidenceRoot, "preview-16x9.png", 1080, 1920)
        };
        File.WriteAllText(Path.Combine(evidenceRoot, "capture-metadata.json"), JsonUtility.ToJson(new CaptureManifest(captures), true));
        AssetDatabase.Refresh();
    }

    [MenuItem("Warrior Raising/Prepare L5 Portrait Game View %#&9")]
    public static void PreparePortraitGameView()
    {
        var gameViewType = typeof(Editor).Assembly.GetType("UnityEditor.GameView");
        var gameView = EditorWindow.GetWindow(gameViewType);
        var setCustomResolution = gameViewType.GetMethod("SetCustomResolution", BindingFlags.Instance | BindingFlags.NonPublic);
        setCustomResolution.Invoke(gameView, new object[] { new Vector2(1080f, 1920f), "L5 Portrait" });
        gameView.Show();
    }

    private static CaptureRecord Capture(string outputDirectory, string fileName, int width, int height)
    {
        EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
        var camera = Camera.main;
        var canvas = UnityEngine.Object.FindFirstObjectByType<Canvas>();
        var safeArea = UnityEngine.Object.FindFirstObjectByType<SafeAreaRoot>();
        ShellCanvasDensity.Configure(canvas.GetComponent<CanvasScaler>());
        safeArea.Apply(new Rect(0f, 0f, width, height), new Vector2(width, height));

        var renderTexture = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32);
        var texture = new Texture2D(width, height, TextureFormat.RGBA32, false);
        camera.targetTexture = renderTexture;
        Canvas.ForceUpdateCanvases();
        camera.Render();
        RenderTexture.active = renderTexture;
        texture.ReadPixels(new Rect(0f, 0f, width, height), 0, 0);
        texture.Apply();
        var path = Path.Combine(outputDirectory, fileName);
        File.WriteAllBytes(path, texture.EncodeToPNG());

        camera.targetTexture = null;
        RenderTexture.active = null;
        UnityEngine.Object.DestroyImmediate(texture);
        UnityEngine.Object.DestroyImmediate(renderTexture);
        return new CaptureRecord(fileName, width, height);
    }

    [Serializable]
    private sealed class CaptureManifest
    {
        public CaptureManifest(CaptureRecord[] captures)
        {
            generatedBy = "Unity 6000.5.4f1 Camera.Render from Assets/Scenes/Bootstrap.unity";
            sourceScene = ScenePath;
            this.captures = captures;
        }

        public string generatedBy;
        public string sourceScene;
        public CaptureRecord[] captures;
    }

    [Serializable]
    private sealed class CaptureRecord
    {
        public CaptureRecord(string path, int width, int height)
        {
            this.path = path;
            this.width = width;
            this.height = height;
        }

        public string path;
        public int width;
        public int height;
    }
}
#endif
