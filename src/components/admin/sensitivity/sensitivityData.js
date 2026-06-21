import { useState, useEffect } from 'react'

const hdr = typeof window !== 'undefined' && localStorage.getItem('choser_token')
  ? { Authorization: `Bearer ${localStorage.getItem('choser_token')}`, 'Content-Type': 'application/json' }
  : { 'Content-Type': 'application/json' }

export function useSensitivityData() {
    const [interParams, setInterParams] = useState({ weightFlatten: 0, keepTopParams: 0, maxScale: 10 })
    const [interResult, setInterResult] = useState(null)
    const [interLoading, setInterLoading] = useState(false)
    const [autoRun, setAutoRun] = useState(false)
    const [curves, setCurves] = useState(null)
    const [curvesLoading, setCurvesLoading] = useState(false)

    const runInteractive = async (params) => {
        setInterLoading(true)
        try {
            const res = await fetch('/api/admin/decision/interactive', { method: 'POST', headers: hdr, body: JSON.stringify(params || interParams) })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setInterResult(data)
        } catch (e) { console.error(e) }
        finally { setInterLoading(false) }
    }

    const loadCurves = async () => {
        setCurvesLoading(true)
        try {
            const res = await fetch('/api/admin/decision/sensitivity-curves', { method: 'POST', headers: hdr })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setCurves(data)
        } catch (e) { console.error(e) }
        finally { setCurvesLoading(false) }
    }

    useEffect(() => {
        if (!autoRun) return
        const timer = setTimeout(() => runInteractive(), 400)
        return () => clearTimeout(timer)
    }, [interParams, autoRun])

    useEffect(() => { runInteractive(); loadCurves() }, [])

    return { interParams, setInterParams, interResult, interLoading, autoRun, setAutoRun, curves, curvesLoading, loadCurves, runInteractive }
}
