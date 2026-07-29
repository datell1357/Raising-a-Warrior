using System.Collections.Generic;

namespace Warrior.Presentation
{
    public enum ShellCopyKey
    {
        StatusTitle,
        StatusSubtitle,
        ResourceCoin,
        ResourceAether,
        ResourceLevel,
        QuestEmpty,
        QuestHint,
        StageIdle,
        CombatWaiting,
        FeatureSheetPeek,
        NavGrowth,
        NavSkills,
        NavEquipment,
        NavWorld,
        NavStore,
        NavSummon,
        PanelGrowth,
        PanelSkills,
        PanelGear,
        PanelWorld,
        PanelStore,
        PanelSummon,
        UpgradeAction,
        QuickSlotEmpty
    }

    public readonly struct LocalizedShellCopy
    {
        public LocalizedShellCopy(string requestedLocale, string resolvedLocale, string value)
        {
            RequestedLocale = requestedLocale;
            ResolvedLocale = resolvedLocale;
            Value = value;
        }

        public string RequestedLocale { get; }
        public string ResolvedLocale { get; }
        public string Value { get; }
        public bool UsedFallback => RequestedLocale != ResolvedLocale;
    }

    public static class ShellCopyCatalog
    {
        private const string FallbackLocale = "en";
        private static readonly IReadOnlyDictionary<ShellCopyKey, string> English =
            new Dictionary<ShellCopyKey, string>
            {
                { ShellCopyKey.StatusTitle, "LV. 10" },
                { ShellCopyKey.StatusSubtitle, "Astral Vanguard" },
                { ShellCopyKey.ResourceCoin, "12,480" },
                { ShellCopyKey.ResourceAether, "5,900" },
                { ShellCopyKey.ResourceLevel, "68%" },
                { ShellCopyKey.QuestEmpty, "Guest active" },
                { ShellCopyKey.QuestHint, "Beginner's Orbit IV" },
                { ShellCopyKey.StageIdle, "STAGE 4 - CELESTIAL GROVE" },
                { ShellCopyKey.CombatWaiting, "AUTO BATTLE" },
                { ShellCopyKey.FeatureSheetPeek, "GROWTH" },
                { ShellCopyKey.NavGrowth, "Growth" },
                { ShellCopyKey.NavSkills, "Skills" },
                { ShellCopyKey.NavEquipment, "Gear" },
                { ShellCopyKey.NavWorld, "World" },
                { ShellCopyKey.NavStore, "Store" },
                { ShellCopyKey.NavSummon, "Summon" },
                { ShellCopyKey.PanelGrowth, "Growth" },
                { ShellCopyKey.PanelSkills, "Skills" },
                { ShellCopyKey.PanelGear, "Equipment" },
                { ShellCopyKey.PanelWorld, "World" },
                { ShellCopyKey.PanelStore, "Store" },
                { ShellCopyKey.PanelSummon, "Summon" },
                { ShellCopyKey.UpgradeAction, "LEVEL UP" },
                { ShellCopyKey.QuickSlotEmpty, "EMPTY" }
            };

        public static LocalizedShellCopy Resolve(string requestedLocale, ShellCopyKey key)
        {
            return new LocalizedShellCopy(requestedLocale, FallbackLocale, English[key]);
        }
    }
}
