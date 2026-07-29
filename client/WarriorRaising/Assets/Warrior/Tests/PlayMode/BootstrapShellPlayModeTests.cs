using System.Collections;
using System.Threading.Tasks;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using Warrior.Application;
using Warrior.Core;
using Warrior.Domain;

namespace Warrior.Tests.PlayMode
{
    [UnityPlatform(RuntimePlatform.Android)]
    public sealed class BootstrapShellPlayModeTests
    {
        [UnityTest]
        public IEnumerator BootstrapShell_whenInitialized_inPlayMode_remainsEmpty()
        {
            var initialization = ShellBootstrap.Initialize();

            yield return null;

            Assert.That(initialization.Identity, Is.EqualTo(ShellIdentity.Empty));
            Assert.That(initialization.Lifecycle, Is.EqualTo(ShellLifecycle.Empty));
        }

        [UnityTest]
        public IEnumerator S_LVWHIB_NS_SESSION_RECONNECT_S_TGKDXL_preserveIdentityProgress()
        {
            var auth = new PlayModeAuthAdapter();
            var progress = new PlayModeProgressAdapter();
            var firstLaunch = new AccountEntryMachine(
                new PlayModeVersionGate(),
                auth,
                progress);

            firstLaunch.EnterAsync("1.0.0").GetAwaiter().GetResult();

            Assert.That(firstLaunch.State, Is.EqualTo(AccountEntryState.Ready));
            Assert.That(firstLaunch.Session.Uid, Is.EqualTo("guest-playmode"));
            Assert.That(firstLaunch.Progress.Marker, Is.EqualTo("playmode-progress"));
            auth.HasStoredSession = true;
            var restart = new AccountEntryMachine(
                new PlayModeVersionGate(),
                auth,
                progress);
            restart.EnterAsync("1.0.0").GetAwaiter().GetResult();
            restart.LinkGoogleAsync().GetAwaiter().GetResult();

            yield return null;

            Assert.That(restart.State, Is.EqualTo(AccountEntryState.Ready));
            Assert.That(restart.Session.Uid, Is.EqualTo(firstLaunch.Session.Uid));
            Assert.That(restart.Session.IsAnonymous, Is.False);
            Assert.That(restart.Progress.Marker, Is.EqualTo(firstLaunch.Progress.Marker));
        }

        private sealed class PlayModeVersionGate : IIdentityVersionGate
        {
            public Task<VersionGateResult> EvaluateAsync(string clientVersion)
            {
                return Task.FromResult(VersionGateResult.Continue);
            }
        }

        private sealed class PlayModeAuthAdapter : IIdentityAuthAdapter
        {
            private readonly AccountSession session = new AccountSession("guest-playmode", true);

            public bool HasStoredSession { get; set; }

            public Task<AccountSession> StartGuestAsync()
            {
                return Task.FromResult(session);
            }

            public Task<ReconnectResult> ReconnectAsync()
            {
                return Task.FromResult(ReconnectResult.Connected(session));
            }

            public Task<AccountSession> ReauthenticateAsync()
            {
                return Task.FromResult(session);
            }

            public Task<GoogleLinkResult> LinkGoogleAsync(string expectedUid)
            {
                return Task.FromResult(new GoogleLinkResult(GoogleLinkStatus.Linked, expectedUid));
            }
        }

        private sealed class PlayModeProgressAdapter : IIdentityProgressAdapter
        {
            private readonly AccountProgress snapshot =
                new AccountProgress("guest-playmode", "playmode-progress");

            public Task<AccountProgress> LoadAsync(string uid)
            {
                return Task.FromResult(snapshot);
            }
        }
    }
}
