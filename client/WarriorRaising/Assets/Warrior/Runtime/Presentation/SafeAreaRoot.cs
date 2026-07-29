using UnityEngine;

namespace Warrior.Presentation
{
    public readonly struct SafeAreaAnchors
    {
        public SafeAreaAnchors(Vector2 minimum, Vector2 maximum)
        {
            Minimum = minimum;
            Maximum = maximum;
        }

        public Vector2 Minimum { get; }
        public Vector2 Maximum { get; }
    }

    public static class SafeAreaMath
    {
        public static SafeAreaAnchors ToAnchors(Rect safeArea, Vector2 screenSize)
        {
            return new SafeAreaAnchors(
                new Vector2(safeArea.xMin / screenSize.x, safeArea.yMin / screenSize.y),
                new Vector2(safeArea.xMax / screenSize.x, safeArea.yMax / screenSize.y));
        }

        public static Rect WithBottomInset(Rect safeArea, float bottomInsetPixels)
        {
            var minimumY = Mathf.Clamp(Mathf.Max(safeArea.yMin, bottomInsetPixels), safeArea.yMin, safeArea.yMax);
            return Rect.MinMaxRect(safeArea.xMin, minimumY, safeArea.xMax, safeArea.yMax);
        }
    }

    public static class ShellReadiness
    {
        public static string Marker(int width, int height)
        {
            return $"T6_SHELL_READY width={width} height={height}";
        }
    }

    [DisallowMultipleComponent]
    public sealed class SafeAreaRoot : MonoBehaviour
    {
        [SerializeField] private RectTransform contentRoot;
        private Rect appliedArea;
        private Vector2 appliedScreen;

        public void Configure(RectTransform root)
        {
            contentRoot = root;
        }

        public void Apply(Rect safeArea, Vector2 screenSize)
        {
            if (appliedArea == safeArea && appliedScreen == screenSize)
            {
                return;
            }

            var anchors = SafeAreaMath.ToAnchors(safeArea, screenSize);
            contentRoot.anchorMin = anchors.Minimum;
            contentRoot.anchorMax = anchors.Maximum;
            contentRoot.offsetMin = Vector2.zero;
            contentRoot.offsetMax = Vector2.zero;
            appliedArea = safeArea;
            appliedScreen = screenSize;
        }

        private void OnEnable()
        {
            Apply(CurrentSafeArea(), new Vector2(Screen.width, Screen.height));
            Debug.Log(ShellReadiness.Marker(Screen.width, Screen.height));
        }

        private void Update()
        {
            Apply(CurrentSafeArea(), new Vector2(Screen.width, Screen.height));
        }

        private static Rect CurrentSafeArea()
        {
            var safeArea = Screen.safeArea;
#if UNITY_ANDROID && !UNITY_EDITOR
            return SafeAreaMath.WithBottomInset(safeArea, AndroidSystemInsets.BottomGesturePixels());
#else
            return safeArea;
#endif
        }
    }

#if UNITY_ANDROID && !UNITY_EDITOR
    internal static class AndroidSystemInsets
    {
        public static float BottomGesturePixels()
        {
            using var unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
            using var activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
            using var window = activity.Call<AndroidJavaObject>("getWindow");
            using var decorView = window.Call<AndroidJavaObject>("getDecorView");
            using var windowInsets = decorView.Call<AndroidJavaObject>("getRootWindowInsets");
            if (windowInsets == null)
            {
                return 0f;
            }

            using var buildVersion = new AndroidJavaClass("android.os.Build$VERSION");
            if (buildVersion.GetStatic<int>("SDK_INT") < 30)
            {
                return windowInsets.Call<int>("getSystemWindowInsetBottom");
            }

            using var insetType = new AndroidJavaClass("android.view.WindowInsets$Type");
            var bottomTypes =
                insetType.CallStatic<int>("systemGestures")
                | insetType.CallStatic<int>("navigationBars");
            using var insets = windowInsets.Call<AndroidJavaObject>("getInsets", bottomTypes);
            return insets.Get<int>("bottom");
        }
    }
#endif
}
