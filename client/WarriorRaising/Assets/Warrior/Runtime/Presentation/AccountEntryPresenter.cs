using UnityEngine;
using UnityEngine.UI;
using Warrior.Application;
using Warrior.Domain;

namespace Warrior.Presentation
{
    [RequireComponent(typeof(Text))]
    [DefaultExecutionOrder(100)]
    public sealed class AccountEntryPresenter : MonoBehaviour
    {
        private async void Start()
        {
            var machine = new AccountEntryMachine(
                new DeviceIdentityVersionGate(),
                new DeviceIdentityAuthAdapter(),
                new DeviceIdentityProgressAdapter());

            await machine.EnterAsync(UnityEngine.Application.version);
            GetComponent<Text>().text = machine.State == AccountEntryState.Ready
                ? "Guest active"
                : "Update required";
        }
    }
}
