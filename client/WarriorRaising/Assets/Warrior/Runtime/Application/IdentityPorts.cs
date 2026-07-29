using System.Threading.Tasks;
using Warrior.Domain;

namespace Warrior.Application
{
    public interface IIdentityVersionGate
    {
        Task<VersionGateResult> EvaluateAsync(string clientVersion);
    }

    public interface IIdentityAuthAdapter
    {
        bool HasStoredSession { get; }

        Task<AccountSession> StartGuestAsync();

        Task<ReconnectResult> ReconnectAsync();

        Task<AccountSession> ReauthenticateAsync();

        Task<GoogleLinkResult> LinkGoogleAsync(string expectedUid);
    }

    public interface IIdentityProgressAdapter
    {
        Task<AccountProgress> LoadAsync(string uid);
    }
}
