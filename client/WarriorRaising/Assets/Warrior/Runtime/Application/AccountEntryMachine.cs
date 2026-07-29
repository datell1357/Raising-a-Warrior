using System;
using System.Threading.Tasks;
using Warrior.Domain;

namespace Warrior.Application
{
    public sealed class AccountEntryMachine
    {
        private readonly IIdentityVersionGate versionGate;
        private readonly IIdentityAuthAdapter auth;
        private readonly IIdentityProgressAdapter progress;

        public AccountEntryMachine(
            IIdentityVersionGate versionGate,
            IIdentityAuthAdapter auth,
            IIdentityProgressAdapter progress)
        {
            this.versionGate = versionGate;
            this.auth = auth;
            this.progress = progress;
            State = AccountEntryState.Idle;
        }

        public AccountEntryState State { get; private set; }

        public AccountSession Session { get; private set; }

        public AccountProgress Progress { get; private set; }

        public async Task EnterAsync(string clientVersion)
        {
            if (State != AccountEntryState.Idle)
            {
                throw new InvalidOperationException("Account entry already started.");
            }

            State = AccountEntryState.CheckingVersion;
            if (await versionGate.EvaluateAsync(clientVersion) == VersionGateResult.UpdateRequired)
            {
                State = AccountEntryState.UpdateRequired;
                return;
            }

            AccountSession session;
            if (auth.HasStoredSession)
            {
                State = AccountEntryState.Reconnecting;
                var reconnect = await auth.ReconnectAsync();
                session = reconnect.Status == ReconnectStatus.Connected
                    ? reconnect.Session
                    : await auth.ReauthenticateAsync();
            }
            else
            {
                State = AccountEntryState.StartingGuest;
                session = await auth.StartGuestAsync();
            }

            var restored = await progress.LoadAsync(session.Uid);
            if (restored.Uid != session.Uid)
            {
                throw new InvalidOperationException("Progress identity does not match the authenticated session.");
            }

            Session = session;
            Progress = restored;
            State = AccountEntryState.Ready;
        }

        public async Task LinkGoogleAsync()
        {
            if (State != AccountEntryState.Ready)
            {
                throw new InvalidOperationException("Google linking requires a ready account.");
            }

            State = AccountEntryState.LinkingGoogle;
            var result = await auth.LinkGoogleAsync(Session.Uid);
            if (result.Status == GoogleLinkStatus.Collision || result.Uid != Session.Uid)
            {
                State = AccountEntryState.Collision;
                return;
            }

            if (result.Status == GoogleLinkStatus.Linked)
            {
                Session = new AccountSession(Session.Uid, false);
            }

            State = AccountEntryState.Ready;
        }
    }
}
