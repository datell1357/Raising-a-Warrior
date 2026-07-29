using System.Collections.Generic;

namespace Warrior.Presentation
{
    public enum ShellCopyKey
    {
        StatusTitle,
        StatusSubtitle,
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
                { ShellCopyKey.StatusTitle, "ASTRAL FORGE" },
                { ShellCopyKey.StatusSubtitle, "Idle shell online" },
                { ShellCopyKey.QuestEmpty, "No active quest" },
                { ShellCopyKey.QuestHint, "Guidance will appear here" },
                { ShellCopyKey.StageIdle, "IDLE WATCH" },
                { ShellCopyKey.CombatWaiting, "Combat space reserved" },
                { ShellCopyKey.FeatureSheetPeek, "FEATURES CLOSED" },
                { ShellCopyKey.NavGrowth, "Growth" },
                { ShellCopyKey.NavSkills, "Skills" },
                { ShellCopyKey.NavEquipment, "Gear" },
                { ShellCopyKey.NavWorld, "World" },
                { ShellCopyKey.NavStore, "Store" },
                { ShellCopyKey.QuickSlotEmpty, "EMPTY" }
            };

        public static LocalizedShellCopy Resolve(string requestedLocale, ShellCopyKey key)
        {
            return new LocalizedShellCopy(requestedLocale, FallbackLocale, English[key]);
        }
    }
}
