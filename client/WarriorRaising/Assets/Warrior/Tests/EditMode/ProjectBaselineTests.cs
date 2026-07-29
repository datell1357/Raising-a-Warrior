using System.IO;
using NUnit.Framework;

namespace Warrior.Tests.EditMode
{
    public sealed class ProjectBaselineTests
    {
        [Test]
        public void ProjectBaseline_whenCharacterized_hasRequiredEditorAndTestFramework()
        {
            var projectRoot = Directory.GetParent(UnityEngine.Application.dataPath).FullName;
            var projectVersion = File.ReadAllText(Path.Combine(projectRoot, "ProjectSettings", "ProjectVersion.txt"));
            var packageManifest = File.ReadAllText(Path.Combine(projectRoot, "Packages", "manifest.json"));

            Assert.That(projectVersion, Does.Contain("m_EditorVersion: 6000.5.4f1"));
            Assert.That(packageManifest, Does.Contain("\"com.unity.test-framework\": \"1.7.0\""));
        }
    }
}
