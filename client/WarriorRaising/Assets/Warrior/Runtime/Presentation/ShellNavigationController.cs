using System;
using UnityEngine;
using UnityEngine.UI;

namespace Warrior.Presentation
{
    public sealed class ShellNavigationController : MonoBehaviour
    {
        private static readonly string[] PanelNames =
        {
            "GrowthPanel",
            "SkillPanel",
            "GearPanel",
            "WorldPanel",
            "StorePanel",
            "SummonPanel"
        };

        private Transform Content => transform.Find("FeatureSheet/Viewport/Content");
        private Transform Navigation => transform.Find("BottomNav");

        private void Awake()
        {
            for (var index = 0; index < PanelNames.Length; index++)
            {
                var destination = Navigation.Find($"NavDestination{index + 1}");
                var selectedIndex = index;
                destination.GetComponent<Button>().onClick.AddListener(() => Select(selectedIndex));
            }

            Select(0);
        }

        public void Select(int index)
        {
            if (index < 0 || index >= PanelNames.Length)
            {
                throw new ArgumentOutOfRangeException(nameof(index), index, null);
            }

            for (var panelIndex = 0; panelIndex < PanelNames.Length; panelIndex++)
            {
                Content.Find(PanelNames[panelIndex]).gameObject.SetActive(panelIndex == index);
                var destination = Navigation.Find($"NavDestination{panelIndex + 1}");
                destination.Find("NavIcon").GetComponent<ShellTokenGraphic>().Apply(
                    panelIndex == index ? ShellColorToken.Ember500 : ShellColorToken.Line);
                destination.Find("Label").GetComponent<ShellTokenGraphic>().Apply(
                    panelIndex == index ? ShellColorToken.Ember500 : ShellColorToken.TextSecondary);
                var indicator = destination.Find("SelectedIndicator");
                if (indicator != null)
                {
                    if (UnityEngine.Application.isPlaying)
                    {
                        indicator.gameObject.SetActive(false);
                        Destroy(indicator.gameObject);
                    }
                    else
                    {
                        DestroyImmediate(indicator.gameObject);
                    }
                }
            }

            var selected = Navigation.Find($"NavDestination{index + 1}");
            var marker = new GameObject("SelectedIndicator", typeof(RectTransform), typeof(Image), typeof(ShellTokenGraphic));
            marker.transform.SetParent(selected, false);
            var rect = marker.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 0f);
            rect.anchorMax = new Vector2(1f, 0f);
            rect.offsetMin = new Vector2(ShellMetrics.Space2Dp, ShellMetrics.Space1Dp);
            rect.offsetMax = new Vector2(-ShellMetrics.Space2Dp, ShellMetrics.Space1Dp + 3f);
            marker.GetComponent<Image>().raycastTarget = false;
            marker.GetComponent<ShellTokenGraphic>().Apply(ShellColorToken.Ember500);
            marker.transform.SetAsLastSibling();
        }
    }
}
