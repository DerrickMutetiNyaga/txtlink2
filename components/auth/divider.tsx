export function Divider({ text }: { text?: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>
      {text && (
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">{text}</span>
        </div>
      )}
    </div>
  )
}

