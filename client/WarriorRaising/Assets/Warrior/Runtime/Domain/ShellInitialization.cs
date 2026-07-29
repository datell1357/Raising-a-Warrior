namespace Warrior.Domain
{
    public enum ShellLifecycle
    {
        Empty
    }

    public sealed class ShellInitialization
    {
        public ShellInitialization(string identity, ShellLifecycle lifecycle)
        {
            Identity = identity;
            Lifecycle = lifecycle;
        }

        public string Identity { get; }

        public ShellLifecycle Lifecycle { get; }
    }
}
