namespace Warrior.Domain
{
    public enum AccountEntryState
    {
        Idle,
        CheckingVersion,
        UpdateRequired,
        StartingGuest,
        Reconnecting,
        Ready,
        LinkingGoogle,
        Collision
    }

    public enum VersionGateResult
    {
        Continue,
        UpdateRequired
    }

    public enum ReconnectStatus
    {
        Connected,
        Expired
    }

    public enum GoogleLinkStatus
    {
        Linked,
        Cancelled,
        Collision
    }

    public sealed class AccountSession
    {
        public AccountSession(string uid, bool isAnonymous)
        {
            Uid = uid;
            IsAnonymous = isAnonymous;
        }

        public string Uid { get; }

        public bool IsAnonymous { get; }
    }

    public sealed class AccountProgress
    {
        public AccountProgress(string uid, string marker)
        {
            Uid = uid;
            Marker = marker;
        }

        public string Uid { get; }

        public string Marker { get; }
    }

    public sealed class ReconnectResult
    {
        private ReconnectResult(ReconnectStatus status, AccountSession session)
        {
            Status = status;
            Session = session;
        }

        public ReconnectStatus Status { get; }

        public AccountSession Session { get; }

        public static ReconnectResult Connected(AccountSession session)
        {
            return new ReconnectResult(ReconnectStatus.Connected, session);
        }

        public static ReconnectResult Expired()
        {
            return new ReconnectResult(ReconnectStatus.Expired, null);
        }
    }

    public sealed class GoogleLinkResult
    {
        public GoogleLinkResult(GoogleLinkStatus status, string uid)
        {
            Status = status;
            Uid = uid;
        }

        public GoogleLinkStatus Status { get; }

        public string Uid { get; }
    }
}
