import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from '../data/seo.js'

// Actualiza <title>, <meta> y <link rel="canonical"> en el <head> para la ruta
// actual (React 18: sin soporte nativo de metadatos, y sin dependencias extra).
// El HTML estático de index.html lleva los valores de la home para los
// crawlers que no ejecutan JS; este componente los sustituye al navegar.

function upsert(selector, create, attrs) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement(create)
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
  return el
}

const setName = (name, content) => upsert(`meta[name="${name}"]`, 'meta', { name, content })
const setProp = (property, content) =>
  upsert(`meta[property="${property}"]`, 'meta', { property, content })

// Canonical path: sin query ni hash y sin barra final (salvo la home).
export function canonicalPath(pathname) {
  const clean = pathname.replace(/\/+$/, '')
  return clean === '' ? '/' : clean
}

const absolute = (value) => (/^https?:\/\//i.test(value) ? value : `${SITE_URL}${value}`)

export default function Seo({ title, description, noindex = false, image = DEFAULT_OG_IMAGE }) {
  const { pathname } = useLocation()

  useEffect(() => {
    const path = canonicalPath(pathname)
    // La home se canoniza como "https://dominio" + "/"; el resto sin barra final.
    const url = `${SITE_URL}${path}`
    const imageUrl = absolute(image)

    document.title = title
    setName('description', description)
    upsert('link[rel="canonical"]', 'link', { rel: 'canonical', href: url })

    const robots = document.head.querySelector('meta[name="robots"]')
    if (noindex) setName('robots', 'noindex, nofollow')
    else robots?.remove()

    setProp('og:type', 'website')
    setProp('og:site_name', SITE_NAME)
    setProp('og:locale', 'es_ES')
    setProp('og:title', title)
    setProp('og:description', description)
    setProp('og:url', url)
    setProp('og:image', imageUrl)

    setName('twitter:card', 'summary_large_image')
    setName('twitter:title', title)
    setName('twitter:description', description)
    setName('twitter:image', imageUrl)
  }, [pathname, title, description, noindex, image])

  return null
}
