'use client'

export function ThemeToggle() {
  return (
    <button
      className="border rounded px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
      onClick={() => {
        document.documentElement.classList.toggle('dark')
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light')
      }}
    >
      Thème
    </button>
  )
}


