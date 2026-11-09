import axios from "axios"
import { ENV } from "../env/environment"

export type TrendScore = { value: number; band: 'low' | 'intermediate' | 'high' } | null

export type TrendPoint = {
  reportId: string
  date: string
  labs: Record<'bilirubin' | 'albumin' | 'platelets' | 'sgot' | 'alt' | 'alk_phos', number | null>
  scores: Record<'fib4' | 'apri' | 'albi', TrendScore>
}

export type Trends = {
  points: TrendPoint[]
  thresholds: {
    fib4: { low: number; lowFrom65: number; high: number }
    apri: { low: number; high: number }
    albi: { grade1: number; grade2: number }
  }
}

export const getTrends = async (): Promise<Trends> => {
    const res = await axios.get(`${ENV}/get-trends`)
    return res.data
}
