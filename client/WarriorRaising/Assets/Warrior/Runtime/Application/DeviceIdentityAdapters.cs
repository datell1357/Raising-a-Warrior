using System;
using System.Threading.Tasks;
using UnityEngine;
using Warrior.Domain;

namespace Warrior.Application
{
    public sealed class DeviceIdentityVersionGate : IIdentityVersionGate
    {
        public Task<VersionGateResult> EvaluateAsync(string clientVersion)
        {
            return Task.FromResult(VersionGateResult.Continue);
        }
    }

    public sealed class DeviceIdentityAuthAdapter : IIdentityAuthAdapter
    {
        public const string UidKey = "warrior.identity.uid";

        public bool HasStoredSession => PlayerPrefs.HasKey(UidKey);

        public Task<AccountSession> StartGuestAsync()
        {
            var session = new AccountSession(Guid.NewGuid().ToString("N"), true);
            PlayerPrefs.SetString(UidKey, session.Uid);
            PlayerPrefs.Save();
            return Task.FromResult(session);
        }

        public Task<ReconnectResult> ReconnectAsync()
        {
            return Task.FromResult(ReconnectResult.Connected(StoredSession()));
        }

        public Task<AccountSession> ReauthenticateAsync()
        {
            return Task.FromResult(StoredSession());
        }

        public Task<GoogleLinkResult> LinkGoogleAsync(string expectedUid)
        {
            return Task.FromResult(new GoogleLinkResult(GoogleLinkStatus.Linked, expectedUid));
        }

        private static AccountSession StoredSession()
        {
            return new AccountSession(PlayerPrefs.GetString(UidKey), true);
        }
    }

    public sealed class DeviceIdentityProgressAdapter : IIdentityProgressAdapter
    {
        public const string MarkerKey = "warrior.identity.progress";

        public Task<AccountProgress> LoadAsync(string uid)
        {
            var marker = PlayerPrefs.GetString(MarkerKey, "guest-progress");
            PlayerPrefs.SetString(MarkerKey, marker);
            PlayerPrefs.Save();
            return Task.FromResult(new AccountProgress(uid, marker));
        }
    }
}
