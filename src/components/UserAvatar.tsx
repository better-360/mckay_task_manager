interface UserAvatarProps {
  user: {
    name?: string
    email: string
    profilePicture?: string
  }
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function UserAvatar({ user, size = 'sm', className = '' }: UserAvatarProps) {
  const sizeClasses = {
    xs: 'h-4 w-4 text-xs',
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
    xl: 'h-12 w-12 text-lg'
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const nameParts = name.trim().split(' ')
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
      }
      return nameParts[0][0].toUpperCase()
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return '?'
  }

  const getAvatarColor = (name?: string, email?: string) => {
    const str = name || email || ''
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500'
    ]
    return colors[Math.abs(hash) % colors.length]
  }

  if (user.profilePicture) {
    return (
      <img
        src={user.profilePicture}
        alt={user.name || user.email}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium ${getAvatarColor(user.name, user.email)} ${className}`}
    >
      {getInitials(user.name, user.email)}
    </div>
  )
} 