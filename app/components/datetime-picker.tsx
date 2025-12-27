"use client"

interface DateTimePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
}

export function DateTimePicker({ value, onChange, label, required }: DateTimePickerProps) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 space-y-2">
      {label && <span>{label}</span>}
      <div className="relative">
        <input
          type="datetime-local"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
        />
      </div>
    </label>
  )
}
