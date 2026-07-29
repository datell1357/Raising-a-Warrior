using Warrior.Core;
using Warrior.Domain;

namespace Warrior.Application
{
    public static class ShellBootstrap
    {
        public static ShellInitialization Initialize()
        {
            return new ShellInitialization(ShellIdentity.Empty, ShellLifecycle.Empty);
        }
    }
}
