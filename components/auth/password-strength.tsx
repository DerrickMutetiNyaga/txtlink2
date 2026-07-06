import { useEffect, useState } from 'react'

interface PasswordStrengthProps {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const [strength, setStrength] = useState<{
    score: number
    label: string
    color: string
  }>({ score: 0, label: '', color: '' })

  useEffect(() => {
    if (!password) {
      setStrength({ score: 0, label: '', color: '' })
      return
    }

    let score = 0
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    }

    Object.values(checks).forEach((check) => {
      if (check) score++
    })

    const strengthMap = [
      { score: 0, label: 'Very Weak', color: 'bg-red-500' },
      { score: 1, label: 'Weak', color: 'bg-red-400' },
      { score: 2, label: 'Fair', color: 'bg-yellow-400' },
      { score: 3, label: 'Good', color: 'bg-blue-400' },
      { score: 4, label: 'Strong', color: 'bg-emerald-500' },
      { score: 5, label: 'Very Strong', color: 'bg-emerald-600' },
    ]

    const currentStrength = strengthMap[Math.min(score, 5)]
    setStrength({
      score,
      label: currentStrength.label,
      color: currentStrength.color,
    })
  }, [password])

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-600">Password strength</span>
        <span className={`text-xs font-medium ${
          strength.score <= 2 ? 'text-red-600' :
          strength.score === 3 ? 'text-yellow-600' :
          'text-emerald-600'
        }`}>
          {strength.label}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${strength.color}`}
          style={{ width: `${(strength.score / 5) * 100}%` }}
        />
      </div>
    </div>
  )
}

