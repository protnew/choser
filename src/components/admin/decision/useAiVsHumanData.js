import { useState, useMemo } from 'react'

export function useAiVsHumanData(aiVsHuman, getDetails) {
    const [expandedRow, setExpandedRow] = useState(null)
    const [page, setPage] = useState(0)
    const PAGE_SIZE = 10
    const totalPages = aiVsHuman ? Math.ceil(aiVsHuman.length / PAGE_SIZE) : 0
    const pageData = aiVsHuman ? aiVsHuman.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : []
    const pageStart = page * PAGE_SIZE

    const aiAverages = useMemo(() => {
        if (!aiVsHuman?.length) return null
        const n = aiVsHuman.length
        const avgOverlap = +(aiVsHuman.reduce((s, r) => s + r.match_percent, 0) / n).toFixed(1)
        const avgOverlapCount = +(aiVsHuman.reduce((s, r) => s + r.match_count, 0) / n).toFixed(1)
        const avgMax = +(aiVsHuman.reduce((s, r) => s + Math.max(r.ai_count, r.human_count), 0) / n).toFixed(1)
        const avgExact = +(aiVsHuman.reduce((s, r) => s + (getDetails(r).position_match_percent || 0), 0) / n).toFixed(1)
        const avgExactN = +(aiVsHuman.reduce((s, r) => s + (getDetails(r).position_match || 0), 0) / n).toFixed(1)
        const avgPartial = +(aiVsHuman.reduce((s, r) => s + (getDetails(r).partial_match_percent || 0), 0) / n).toFixed(1)
        const avgPartialN = +(aiVsHuman.reduce((s, r) => s + (getDetails(r).partial_match || 0), 0) / n).toFixed(1)
        const avgAiCount = +(aiVsHuman.reduce((s, r) => s + r.ai_count, 0) / n).toFixed(1)
        const avgHumanCount = +(aiVsHuman.reduce((s, r) => s + r.human_count, 0) / n).toFixed(1)
        return { avgOverlap, avgOverlapCount, avgMax, avgExact, avgExactN, avgPartial, avgPartialN, avgAiCount, avgHumanCount }
    }, [aiVsHuman, getDetails])

    const pieChartOption = useMemo(() => {
        if (!aiVsHuman?.length) return null
        const buckets = { 'Точное 3/3': 0, 'Точное 2/3': 0, 'Точное 1/3': 0, 'В топ-3, но не на месте': 0, 'Нет в топ-3': 0 }
        aiVsHuman.forEach(r => {
            const d = getDetails(r); const exact = d.position_match || 0; const partial = d.partial_match || 0
            if (exact === 3) buckets['Точное 3/3']++
            else if (exact === 2) buckets['Точное 2/3']++
            else if (exact === 1) buckets['Точное 1/3']++
            else if (partial > 0 || (d.top3_overlap_count || 0) > 0) buckets['В топ-3, но не на месте']++
            else buckets['Нет в топ-3']++
        })
        const colors = { 'Точное 3/3': '#22c55e', 'Точное 2/3': '#84cc16', 'Точное 1/3': '#f59e0b', 'В топ-3, но не на месте': '#f97316', 'Нет в топ-3': '#ef4444' }
        return {
            tooltip: { trigger: 'item' }, legend: { bottom: 0, textStyle: { fontSize: 12 } },
            series: [{ type: 'pie', radius: ['25%', '55%'], center: ['50%', '42%'],
                data: Object.entries(buckets).filter(([,v]) => v > 0).map(([k, v]) => ({
                    name: `${k} (${v} табл., ${((v/aiVsHuman.length)*100).toFixed(0)}%)`, value: v, itemStyle: { color: colors[k] }
                })), label: { formatter: '{b}', fontSize: 12, lineHeight: 14 }
            }]
        }
    }, [aiVsHuman, getDetails])

    return {
        expandedRow, setExpandedRow,
        page, setPage, totalPages, pageData, pageStart,
        aiAverages, pieChartOption
    }
}
