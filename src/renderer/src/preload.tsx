window.onload = (): void => {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  const body = document.body

  const changeTheme = (e: MediaQueryList | MediaQueryListEvent): void => {
    if (e.matches) {
      if (!body.hasAttribute('theme-mode')) {
        body.setAttribute('theme-mode', 'dark')
      }
    } else {
      if (body.hasAttribute('theme-mode')) {
        body.removeAttribute('theme-mode')
      }
    }
  }

  changeTheme(mql)

  mql.addEventListener('change', changeTheme)
}
