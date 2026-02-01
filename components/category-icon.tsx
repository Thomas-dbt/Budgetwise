import React from 'react'
import * as Icons from 'lucide-react'
import { LucideProps } from 'lucide-react'

interface CategoryIconProps extends LucideProps {
    iconName?: string | null
    emoji?: string | null
    className?: string
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
    iconName,
    emoji,
    className,
    ...props
}) => {
    // 1. Try to render Lucide icon if name is provided
    if (iconName) {
        // Access the icon component dynamically
        // @ts-ignore - Dynamic access to icons
        const IconComponent = Icons[iconName as keyof typeof Icons] as React.ElementType

        if (IconComponent) {
            return <IconComponent className={className} {...props} />
        }
    }

    // 2. Fallback to emoji if provided
    if (emoji) {
        return <span className={className} role="img" aria-label="category icon" style={{ fontSize: '1.2em', lineHeight: '1em', display: 'inline-block' }}>{emoji}</span>
    }

    // 3. Fallback to a default icon
    return <Icons.HelpCircle className={className} {...props} />
}
