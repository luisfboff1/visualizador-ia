import { ModelUsage } from '../types'

interface Props {
  models: ModelUsage[]
  title?: string
}

export function ModelTable({ models, title = 'Modelos' }: Props) {
  if (!models.length) return null

  return (
    <div className="model-table">
      <div className="model-table-title">{title}</div>
      <table>
        <thead>
          <tr>
            <th>Modelo</th>
            <th>Requests</th>
            <th>Gross (USD)</th>
            <th>Billed (USD)</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.name}>
              <td className="model-name">{m.name}</td>
              <td>{m.requests.toLocaleString()}</td>
              <td>${m.grossUsd.toFixed(2)}</td>
              <td>${m.billedUsd.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
