'use client'

import { ekstrePDF } from '@/lib/pdf'

type Props = {
  musteri: any
  hareketler: any[]
}

export default function EkstrePDFButton({ musteri, hareketler }: Props) {
  return (
    <button
      onClick={() => ekstrePDF(musteri, hareketler)}
      className="text-sm text-gray-600 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
    >
      Ekstre PDF
    </button>
  )
}
