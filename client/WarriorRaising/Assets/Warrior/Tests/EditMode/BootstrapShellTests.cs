using System.Reflection;
using NUnit.Framework;
using Warrior.Application;
using Warrior.Core;
using Warrior.Domain;

namespace Warrior.Tests.EditMode
{
    public sealed class BootstrapShellTests
    {
        [Test]
        public void BootstrapShell_whenInitialized_returnsCanonicalEmptyShell()
        {
            var initialization = ShellBootstrap.Initialize();

            Assert.That(initialization.Identity, Is.EqualTo(ShellIdentity.Empty));
            Assert.That(initialization.Lifecycle, Is.EqualTo(ShellLifecycle.Empty));
        }

        [Test]
        public void RuntimeAssemblyBoundary_whenLoaded_exposesEveryDeclaredRuntimeAssembly()
        {
            var assemblyNames = new[]
            {
                "Core",
                "Domain",
                "Application",
                "Combat",
                "Content",
                "Platform",
                "Presentation"
            };

            foreach (var assemblyName in assemblyNames)
            {
                Assert.That(Assembly.Load(assemblyName), Is.Not.Null, assemblyName);
            }
        }
    }
}
