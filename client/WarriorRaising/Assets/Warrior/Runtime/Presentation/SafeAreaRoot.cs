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
            Apply(Screen.safeArea, new Vector2(Screen.width, Screen.height));
            Debug.Log(ShellReadiness.Marker(Screen.width, Screen.height));
        }

        private void Update()
        {
            Apply(Screen.safeArea, new Vector2(Screen.width, Screen.height));
        }
    }
}
