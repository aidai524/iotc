"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // 避免 hydration 不匹配
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={cn("w-10 h-10 rounded-xl bg-secondary animate-pulse", className)} />
    )
  }

  const cycleTheme = () => {
    if (theme === "dark") {
      setTheme("light")
    } else if (theme === "light") {
      setTheme("system")
    } else {
      setTheme("dark")
    }
  }

  const getIcon = () => {
    if (theme === "system") {
      return <Monitor className="w-5 h-5" />
    }
    if (resolvedTheme === "dark") {
      return <Moon className="w-5 h-5" />
    }
    return <Sun className="w-5 h-5" />
  }

  const getLabel = () => {
    if (theme === "system") return "跟随系统"
    if (theme === "dark") return "深色模式"
    return "浅色模式"
  }

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        "flex items-center gap-2 p-2.5 rounded-xl transition-all duration-200",
        "bg-secondary/50 hover:bg-secondary",
        "text-foreground/80 hover:text-foreground",
        "active:scale-95",
        className
      )}
      title={getLabel()}
      aria-label={`切换主题：${getLabel()}`}
    >
      <span className="transition-transform duration-300">
        {getIcon()}
      </span>
      {showLabel && (
        <span className="text-sm font-medium">{getLabel()}</span>
      )}
    </button>
  )
}

// 更紧凑的版本，用于头部
export function ThemeToggleCompact({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className={cn("w-9 h-9 rounded-lg bg-secondary/30 animate-pulse", className)} />
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative w-9 h-9 rounded-lg flex items-center justify-center",
        "bg-secondary/30 hover:bg-secondary/50",
        "transition-all duration-200 active:scale-95",
        className
      )}
      title={resolvedTheme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
    >
      <Sun className={cn(
        "w-4 h-4 absolute transition-all duration-300",
        resolvedTheme === "dark" 
          ? "rotate-90 scale-0 opacity-0" 
          : "rotate-0 scale-100 opacity-100"
      )} />
      <Moon className={cn(
        "w-4 h-4 absolute transition-all duration-300",
        resolvedTheme === "dark" 
          ? "rotate-0 scale-100 opacity-100" 
          : "-rotate-90 scale-0 opacity-0"
      )} />
    </button>
  )
}
