'use client'
import { useState } from 'react'

export type Column = {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  render?: (row: any) => React.ReactNode
  mobileHide?: boolean
}

type Props = {
  columns: Column[]
  data: any[]
  mobileCard: (row: any) => React.ReactNode
  keyField?: string
  emptyText?: string
}

export default function ResponsiveList({ columns, data, mobileCard, keyField = 'id', emptyText = 'Kayıt yok' }: Props) {
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0
    const va = a[sortKey] ?? '', vb = b[sortKey] ?? ''
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  return (
    <>
      {/* Desktop tablo */}
      <div className="hide-mobile card" style={{ overflowX:'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}
                  onClick={() => col.sortable && toggleSort(col.key)}
                  style={{ textAlign: col.align ?? 'left', cursor: col.sortable ? 'pointer' : 'default' }}>
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span style={{ marginLeft:4, fontSize:10 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                  {col.sortable && sortKey !== col.key && (
                    <span style={{ marginLeft:4, fontSize:10, opacity:.3 }}>⇅</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row[keyField]}>
                {columns.map(col => (
                  <td key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={columns.length} style={{ textAlign:'center', color:'#9099A8', padding:'48px 0', fontSize:13 }}>{emptyText}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobil kartlar */}
      <div className="show-mobile" style={{ display:'none', flexDirection:'column', gap:10 }}>
        {sorted.map(row => (
          <div key={row[keyField]}>{mobileCard(row)}</div>
        ))}
        {sorted.length === 0 && (
          <div style={{ textAlign:'center', color:'#9099A8', padding:'48px 0', fontSize:13 }}>{emptyText}</div>
        )}
      </div>
    </>
  )
}
