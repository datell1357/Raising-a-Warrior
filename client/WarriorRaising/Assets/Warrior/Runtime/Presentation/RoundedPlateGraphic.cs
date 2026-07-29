using UnityEngine;
using UnityEngine.UI;

namespace Warrior.Presentation
{
    [DisallowMultipleComponent]
    public sealed class RoundedPlateGraphic : MonoBehaviour
    {
        [SerializeField] private float radius = ShellMetrics.RadiusMediumDp;
        [SerializeField] private ShellColorToken token;

        public void Apply(ShellColorToken value)
        {
            token = value;
            ConfigureRoundedLayer("PlateShadow", ShellColorToken.Shadow, 0f, -ShellMetrics.StrokeDefaultDp);
            ConfigureRoundedLayer("PlateRim", ShellColorToken.Rim, 0f, 0f);
            ConfigureRoundedLayer("PlateFill", token, ShellMetrics.StrokeDefaultDp, 0f);
            ConfigureEngraving();
        }

        private void ConfigureRoundedLayer(string layerName, ShellColorToken layerToken, float inset, float verticalOffset)
        {
            var layer = transform.Find(layerName);
            if (layer == null)
            {
                layer = new GameObject(layerName, typeof(RectTransform)).transform;
                layer.SetParent(transform, false);
            }

            var layerRect = (RectTransform)layer;
            layerRect.anchorMin = Vector2.zero;
            layerRect.anchorMax = Vector2.one;
            layerRect.offsetMin = new Vector2(inset, inset + verticalOffset);
            layerRect.offsetMax = new Vector2(-inset, -inset + verticalOffset);
            ConfigureFill(layer, "Horizontal", layerToken, new Vector2(0f, radius), new Vector2(0f, -radius));
            ConfigureFill(layer, "Vertical", layerToken, new Vector2(radius, 0f), new Vector2(-radius, 0f));
        }

        private void ConfigureEngraving()
        {
            var engraving = transform.Find("PlateEngraving");
            if (engraving == null)
            {
                engraving = new GameObject("PlateEngraving", typeof(RectTransform), typeof(Image), typeof(ShellTokenGraphic)).transform;
                engraving.SetParent(transform, false);
            }

            var rect = (RectTransform)engraving;
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = Vector2.one;
            rect.offsetMin = new Vector2(radius, -ShellMetrics.Space1Dp);
            rect.offsetMax = new Vector2(-radius, -ShellMetrics.Space1Dp + ShellMetrics.StrokeDefaultDp);
            engraving.GetComponent<Image>().raycastTarget = false;
            engraving.GetComponent<ShellTokenGraphic>().Apply(ShellColorToken.Shadow);
        }

        private static void ConfigureFill(Transform parent, string childName, ShellColorToken layerToken, Vector2 offsetMin, Vector2 offsetMax)
        {
            var child = parent.Find(childName);
            if (child == null)
            {
                child = new GameObject(childName, typeof(RectTransform), typeof(Image), typeof(ShellTokenGraphic)).transform;
                child.SetParent(parent, false);
            }

            var rect = (RectTransform)child;
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = offsetMin;
            rect.offsetMax = offsetMax;
            child.GetComponent<Image>().raycastTarget = false;
            child.GetComponent<ShellTokenGraphic>().Apply(layerToken);
        }
    }
}
