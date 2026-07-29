using UnityEngine;
using UnityEngine.UI;

namespace Warrior.Presentation
{
    [DisallowMultipleComponent]
    [RequireComponent(typeof(Text))]
    public sealed class ShellLocalizedText : MonoBehaviour
    {
        [SerializeField] private ShellCopyKey key;

        public void Apply(ShellCopyKey value)
        {
            key = value;
            Refresh();
        }

        private void Awake()
        {
            Refresh();
        }

        private void Refresh()
        {
            GetComponent<Text>().text = ShellCopyCatalog.Resolve("en", key).Value;
        }
    }
}
