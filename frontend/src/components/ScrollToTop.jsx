// ScrollToTop — resets the window scroll position to the top on every route
// change. In a SPA the browser keeps the previous scroll offset when navigating
// to a new view, which makes pages appear to open "halfway down". Rendering this
// component inside the router fixes that: each navigation starts at the top.
//
// Note: it only reacts to pathname changes, not to in-page hash anchors
// (e.g. "/#carta"), so anchor links on the home page keep working.

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
