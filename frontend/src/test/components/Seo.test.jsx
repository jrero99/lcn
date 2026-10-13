import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Seo, { canonicalPath } from '../../components/Seo.jsx'

const meta = (sel) => document.head.querySelector(sel)

function renderSeo(path, props) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Seo title="T" description="D" {...props} />
    </MemoryRouter>,
  )
}

describe('Seo', () => {
  it('sets title, description, canonical and social tags', () => {
    renderSeo('/carta/?x=1')
    expect(document.title).toBe('T')
    expect(meta('meta[name="description"]').content).toBe('D')
    expect(meta('link[rel="canonical"]').href).toBe('https://lacasanostragrup.com/carta')
    expect(meta('meta[property="og:url"]').content).toBe('https://lacasanostragrup.com/carta')
    expect(meta('meta[property="og:image"]').content).toBe('https://lacasanostragrup.com/og-image.jpg')
    expect(meta('meta[name="twitter:card"]').content).toBe('summary_large_image')
    expect(meta('meta[name="robots"]')).toBeNull()
  })

  it('adds and removes robots noindex', () => {
    const { unmount } = renderSeo('/login', { noindex: true })
    expect(meta('meta[name="robots"]').content).toBe('noindex, nofollow')
    unmount()
    renderSeo('/')
    expect(meta('meta[name="robots"]')).toBeNull()
  })

  it('normalises canonical paths', () => {
    expect(canonicalPath('/')).toBe('/')
    expect(canonicalPath('/reservar/')).toBe('/reservar')
  })
})
