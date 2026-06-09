// CategoryNav — horizontal scrollable tab bar for catalog categories.
// Stays sticky just below the site header (which is itself sticky at top: 0).
import { useRef } from 'react'

export default function CategoryNav({ categories, activeId, onSelect }) {
  const navRef = useRef(null)

  function handleClick(categoryId) {
    onSelect(categoryId)

    // Scroll the clicked tab into view within the nav bar (horizontal)
    const button = navRef.current?.querySelector(`[data-cat="${categoryId}"]`)
    if (button) {
      button.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    }
  }

  return (
    <nav
      className="cat-nav"
      aria-label="Categorías de la carta"
      ref={navRef}
    >
      <ul className="cat-nav-list" role="tablist">
        {categories.map((cat) => (
          <li key={cat.id} role="presentation">
            <button
              role="tab"
              aria-selected={activeId === cat.id}
              data-cat={cat.id}
              className={`cat-nav-tab${activeId === cat.id ? ' cat-nav-tab--active' : ''}`}
              onClick={() => handleClick(cat.id)}
            >
              {cat.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
