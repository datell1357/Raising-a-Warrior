using UnityEngine;

namespace Warrior.Presentation
{
    [DisallowMultipleComponent]
    public sealed class ShellTouchTarget : MonoBehaviour
    {
        [SerializeField] private float minimumSizeDp = ShellMetrics.MinimumTargetDp;

        public float MinimumSizeDp => minimumSizeDp;
    }
}
