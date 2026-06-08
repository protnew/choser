import { useState, useEffect } from 'react'

export function useDecisionData() {
    const [aiVsHuman, setAiVsHuman] = useState(null)
    const [sensitivity, setSensitivity] = useState(null)
    const [loading, setLoading] = useState('')
    const [error, setError] = useState('')
    const [interParams, setInterParams] = useState({ removeWeights: false, keepTopParams: 0, scoreScale: 'original' })
    const [interResult, setInterResult] = useState(null)
    const [interLoading, setInterLoading] = useState(false)
    const [autoRun, setAutoRun] = useState(false)

    const token = typeof window !== 'undefined' ? localStorage.getItem('choser_token') : ''
    const hdr = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }

    const getDetails = (r) => { try { return JSON.parse(r.details) } catch { return {} } }

    const runAiVsHuman = async () => {
        setLoading('ai-vs-human'); setError('')
        try {
            const res = await fetch('/api/admin/decision/ai-vs-human', { method: 'POST', headers: hdr, body: JSON.stringify({ count: 100, force: true }) })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setAiVsHuman(data.results)
        } catch (e) { setError('AI vs Человек: ' + e.message) }
        finally { setLoading('') }
    }

    const runSensitivity = async () => {
        setLoading('sensitivity'); setError('')
        try {
            const res = await fetch('/api/admin/decision/sensitivity', { method: 'POST', headers: hdr })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setSensitivity(data)
        } catch (e) { setError('Чувствительность: ' + e.message) }
        finally { setLoading('') }
    }

    const runInteractive = async (params) => {
        setInterLoading(true)
        try {
            const res = await fetch('/api/admin/decision/interactive', { method: 'POST', headers: hdr, body: JSON.stringify(params || interParams) })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setInterResult(data)
        } catch (e) { setError('Интерактивный анализ: ' + e.message) }
        finally { setInterLoading(false) }
    }

    useEffect(() => {
        fetch('/api/admin/decision/ai-vs-human', { headers: hdr })
            .then(r => r.json()).then(d => { if (d.results?.length) setAiVsHuman(d.results) }).catch(() => {})
        fetch('/api/admin/decision/sensitivity', { headers: hdr })
            .then(r => r.json()).then(d => { if (d.results?.length) setSensitivity(d) }).catch(() => {})
        fetch('/api/admin/decision/interactive', { method: 'POST', headers: hdr, body: JSON.stringify({ removeWeights: false, keepTopParams: 0, scoreScale: 'original' }) })
            .then(r => r.json()).then(d => { if (d.results) setInterResult(d) }).catch(() => {})
    }, [])

    useEffect(() => {
        if (!autoRun) return
        const timer = setTimeout(() => runInteractive(), 300)
        return () => clearTimeout(timer)
    }, [interParams, autoRun])

    return {
        aiVsHuman, sensitivity, loading, error, interParams, interResult, interLoading,
        setInterParams, setAutoRun, runAiVsHuman, runSensitivity, runInteractive, getDetails, hdr
    }
}
