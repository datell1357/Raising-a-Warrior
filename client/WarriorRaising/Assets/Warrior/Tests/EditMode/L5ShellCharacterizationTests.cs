using System.IO;
using System.Linq;
using NUnit.Framework;
using Warrior.Application;
using Warrior.Core;
using Warrior.Domain;

namespace Warrior.Tests.EditMode
{
    public sealed class L5ShellCharacterizationTests
    {
        [Test]
        public void L4Shell_whenCharacterized_remainsCanonicalAndEmpty()
        {
            var initialization = ShellBootstrap.Initialize();

            Assert.That(initialization.Identity, Is.EqualTo(ShellIdentity.Empty));
            Assert.That(initialization.Lifecycle, Is.EqualTo(ShellLifecycle.Empty));
        }

        [Test]
        public void L4AssemblyGraph_whenCharacterized_hasExactlyNineAsmdefsAndNoAsmrefs()
        {
            var assetsRoot = UnityEngine.Application.dataPath;

            var asmdefs = Directory.GetFiles(assetsRoot, "*.asmdef", SearchOption.AllDirectories);
            var asmrefs = Directory.GetFiles(assetsRoot, "*.asmref", SearchOption.AllDirectories);

            Assert.That(asmdefs.Select(Path.GetFileNameWithoutExtension), Is.EquivalentTo(new[]
            {
                "Core", "Domain", "Application", "Combat", "Content", "Platform", "Presentation",
                "Tests.EditMode", "Tests.PlayMode"
            }));
            Assert.That(asmrefs, Is.Empty);
        }
    }
}
