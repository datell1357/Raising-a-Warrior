using UnityEditor;
using UnityEditor.TestTools;

[assembly: TestPlayerBuildModifier(typeof(Warrior.Tests.EditMode.CleanAndroidTestPlayerBuildModifier))]

namespace Warrior.Tests.EditMode
{
    public sealed class CleanAndroidTestPlayerBuildModifier : ITestPlayerBuildModifier
    {
        public BuildPlayerOptions ModifyOptions(BuildPlayerOptions playerOptions)
        {
            if (playerOptions.target == BuildTarget.Android)
            {
                playerOptions.options |= BuildOptions.CleanBuildCache;
            }

            return playerOptions;
        }
    }
}
