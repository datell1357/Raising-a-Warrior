using System.Threading.Tasks;
using NUnit.Framework;
using Warrior.Application;
using Warrior.Domain;

namespace Warrior.Tests.EditMode
{
    public sealed class AccountEntryMachineTests
    {
        [Test]
        public async Task S_LVWHIB_BelowMinimumVersion_BlocksBeforeCreatingGuest()
        {
            var auth = new FakeAuthAdapter();
            var progress = new FakeProgressAdapter();
            var machine = new AccountEntryMachine(
                new FakeVersionGate(VersionGateResult.UpdateRequired),
                auth,
                progress);

            await machine.EnterAsync("0.9.9");

            Assert.That(machine.State, Is.EqualTo(AccountEntryState.UpdateRequired));
            Assert.That(auth.StartGuestCalls, Is.Zero);
            Assert.That(progress.LoadCalls, Is.Zero);
        }

        [Test]
        public async Task S_LVWHIB_And_NS_SESSION_RECONNECT_RestoreIdenticalGuestProgress()
        {
            var session = new AccountSession("guest-a", true);
            var progressSnapshot = new AccountProgress("guest-a", "preserved-progress");
            var auth = new FakeAuthAdapter
            {
                GuestSession = session,
                ReconnectResult = ReconnectResult.Connected(session)
            };
            var progress = new FakeProgressAdapter { Snapshot = progressSnapshot };
            var firstLaunch = new AccountEntryMachine(
                new FakeVersionGate(VersionGateResult.Continue),
                auth,
                progress);

            await firstLaunch.EnterAsync("1.0.0");

            Assert.That(firstLaunch.State, Is.EqualTo(AccountEntryState.Ready));
            Assert.That(firstLaunch.Progress, Is.SameAs(progressSnapshot));
            auth.HasStoredSession = true;
            var restart = new AccountEntryMachine(
                new FakeVersionGate(VersionGateResult.Continue),
                auth,
                progress);

            await restart.EnterAsync("1.0.0");

            Assert.That(restart.Session.Uid, Is.EqualTo(firstLaunch.Session.Uid));
            Assert.That(restart.Progress.Marker, Is.EqualTo(firstLaunch.Progress.Marker));
            Assert.That(auth.StartGuestCalls, Is.EqualTo(1));
            Assert.That(auth.ReconnectCalls, Is.EqualTo(1));
        }

        [Test]
        public async Task NS_SESSION_RECONNECT_ExpiredToken_ReauthenticatesWithoutReplacementGuest()
        {
            var session = new AccountSession("guest-a", true);
            var auth = new FakeAuthAdapter
            {
                HasStoredSession = true,
                ReconnectResult = ReconnectResult.Expired(),
                ReauthenticatedSession = session
            };
            var progress = new FakeProgressAdapter
            {
                Snapshot = new AccountProgress("guest-a", "preserved-progress")
            };
            var machine = new AccountEntryMachine(
                new FakeVersionGate(VersionGateResult.Continue),
                auth,
                progress);

            await machine.EnterAsync("1.0.0");

            Assert.That(machine.State, Is.EqualTo(AccountEntryState.Ready));
            Assert.That(machine.Session.Uid, Is.EqualTo("guest-a"));
            Assert.That(machine.Progress.Marker, Is.EqualTo("preserved-progress"));
            Assert.That(auth.ReauthenticateCalls, Is.EqualTo(1));
            Assert.That(auth.StartGuestCalls, Is.Zero);
        }

        [TestCase(GoogleLinkStatus.Linked, AccountEntryState.Ready)]
        [TestCase(GoogleLinkStatus.Cancelled, AccountEntryState.Ready)]
        [TestCase(GoogleLinkStatus.Collision, AccountEntryState.Collision)]
        public async Task S_TGKDXL_GoogleLinkResult_NeverOverwritesGuestProgress(
            GoogleLinkStatus linkStatus,
            AccountEntryState expectedState)
        {
            var session = new AccountSession("guest-a", true);
            var snapshot = new AccountProgress("guest-a", "preserved-progress");
            var auth = new FakeAuthAdapter
            {
                GuestSession = session,
                LinkResult = new GoogleLinkResult(linkStatus, "guest-a")
            };
            var machine = new AccountEntryMachine(
                new FakeVersionGate(VersionGateResult.Continue),
                auth,
                new FakeProgressAdapter { Snapshot = snapshot });
            await machine.EnterAsync("1.0.0");

            await machine.LinkGoogleAsync();

            Assert.That(machine.State, Is.EqualTo(expectedState));
            Assert.That(machine.Session.Uid, Is.EqualTo("guest-a"));
            Assert.That(machine.Progress, Is.SameAs(snapshot));
        }

        private sealed class FakeVersionGate : IIdentityVersionGate
        {
            private readonly VersionGateResult result;

            public FakeVersionGate(VersionGateResult result)
            {
                this.result = result;
            }

            public Task<VersionGateResult> EvaluateAsync(string clientVersion)
            {
                return Task.FromResult(result);
            }
        }

        private sealed class FakeAuthAdapter : IIdentityAuthAdapter
        {
            public bool HasStoredSession { get; set; }
            public AccountSession GuestSession { get; set; } = new AccountSession("guest-a", true);
            public ReconnectResult ReconnectResult { get; set; } = ReconnectResult.Expired();
            public AccountSession ReauthenticatedSession { get; set; } = new AccountSession("guest-a", true);
            public GoogleLinkResult LinkResult { get; set; } = new GoogleLinkResult(GoogleLinkStatus.Cancelled, "guest-a");
            public int StartGuestCalls { get; private set; }
            public int ReconnectCalls { get; private set; }
            public int ReauthenticateCalls { get; private set; }

            public Task<AccountSession> StartGuestAsync()
            {
                StartGuestCalls += 1;
                return Task.FromResult(GuestSession);
            }

            public Task<ReconnectResult> ReconnectAsync()
            {
                ReconnectCalls += 1;
                return Task.FromResult(ReconnectResult);
            }

            public Task<AccountSession> ReauthenticateAsync()
            {
                ReauthenticateCalls += 1;
                return Task.FromResult(ReauthenticatedSession);
            }

            public Task<GoogleLinkResult> LinkGoogleAsync(string expectedUid)
            {
                return Task.FromResult(LinkResult);
            }
        }

        private sealed class FakeProgressAdapter : IIdentityProgressAdapter
        {
            public AccountProgress Snapshot { get; set; } = new AccountProgress("guest-a", "guest-initial");
            public int LoadCalls { get; private set; }

            public Task<AccountProgress> LoadAsync(string uid)
            {
                LoadCalls += 1;
                return Task.FromResult(Snapshot);
            }
        }
    }
}
