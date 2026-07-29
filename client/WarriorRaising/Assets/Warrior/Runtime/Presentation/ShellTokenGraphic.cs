using UnityEngine;
using UnityEngine.UI;

namespace Warrior.Presentation
{
    [DisallowMultipleComponent]
    [RequireComponent(typeof(Graphic))]
    public sealed class ShellTokenGraphic : MonoBehaviour
    {
        [SerializeField] private ShellColorToken token;

        public void Apply(ShellColorToken value)
        {
            token = value;
            GetComponent<Graphic>().color = ShellDesignTokens.Color(token);
        }

        private void OnValidate()
        {
            GetComponent<Graphic>().color = ShellDesignTokens.Color(token);
        }
    }
}
