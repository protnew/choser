import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouncilStream } from './council/useCouncilStream.js';
import ChatList from './council/ChatList.jsx';
import CouncilSettings from './council/CouncilSettings.jsx';
import CouncilTable from './council/CouncilTable.jsx';
import { useLang } from '../contexts/LangContext';
import { ChoserLog } from '../utils/log';

export default function DecisionPage() {
    ChoserLog.debug('PAGE', 'DecisionPage render');
    const navigate = useNavigate();
    const { locale } = useLang();
    const {
        tables, selectedTable, setSelectedTable,
        topic, setTopic, topicDesc, setTopicDesc,
        numParameters, setNumParameters, numObjects, setNumObjects,
        personas, setPersonas,
        input, setInput,
        running, loaded,
        enabledAgents, setEnabledAgents,
        mode, setMode, searchMode, setSearchMode,
        lastResult, setLastResult,
        activeTab, setActiveTab,
        saveStatus, setSaveStatus, shareLink, setShareLink,
        agentStatuses, currentThinking, elapsedMs,
        councilWarning, councilRecommendation,
        tokenBudget, setTokenBudget, maxDuration, setMaxDuration,
        wantTree, setWantTree,
        runCouncil, stopCouncil, saveAsTable, shareResult,
        comparison,
        councilHistory, loadFromHistory, clearHistory,
        deletedHistory, deleteHistory, renameHistory,
        restoreHistory, permanentDeleteHistory, emptyTrash,
        moveHistory,
    } = useCouncilStream();

    /* ── Dark mode (reactive via MutationObserver) ── */
    const [isDark, setIsDark] = useState(() => document.body.classList.contains('dark'));
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.body.classList.contains('dark'));
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const brd = isDark ? '#374151' : '#e5e7eb';
    const bg = isDark ? '#111827' : '#ffffff';
    const bgI = isDark ? '#1f2937' : '#f9fafb';
    const tM = isDark ? '#ffffff' : '#000000';
    const tS = isDark ? '#d1d5db' : '#374151';
    const inp = {
        width: '100%', padding: 8, borderRadius: 6,
        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
        fontSize: 14, marginBottom: 0, boxSizing: 'border-box',
        background: isDark ? '#1f2937' : '#ffffff',
        color: isDark ? '#ffffff' : '#000000',
    };

    /* ── Active history item tracking ── */
    const [activeHistoryId, setActiveHistoryId] = useState(null);

    const handleSelectHistory = (item) => {
        loadFromHistory(item.result, item.topic);
        setActiveHistoryId(item.id);
    };

    const handleNewChat = () => {
        setTopic('');
        setTopicDesc('');
        setLastResult(null);
        setActiveHistoryId(null);
        sessionStorage.removeItem('choser_last_result');
    };

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: bg }}>
            {/* LEFT: ChatList (ChatGPT-style history) */}
            <ChatList
                councilHistory={councilHistory}
                onSelectHistory={handleSelectHistory}
                clearHistory={clearHistory}
                activeHistoryId={activeHistoryId}
                navigate={navigate}
                onNewChat={handleNewChat}
                deletedHistory={deletedHistory}
                onDeleteHistory={deleteHistory}
                onRenameHistory={renameHistory}
                onRestoreHistory={restoreHistory}
                onPermanentDeleteHistory={permanentDeleteHistory}
                onEmptyTrash={emptyTrash}
                onMoveHistory={moveHistory}
                isDark={isDark} brd={brd} bg={bg} bgI={bgI} tM={tM} tS={tS}
            />

            {/* RIGHT: Settings + Table */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Settings panel (scrollable, above table) */}
                <CouncilSettings
                    topic={topic} setTopic={setTopic}
                    topicDesc={topicDesc} setTopicDesc={setTopicDesc}
                    numParameters={numParameters} setNumParameters={setNumParameters}
                    numObjects={numObjects} setNumObjects={setNumObjects}
                    tables={tables} selectedTable={selectedTable} setSelectedTable={setSelectedTable}
                    mode={mode} setMode={setMode}
                    searchMode={searchMode} setSearchMode={setSearchMode}
                    personas={personas} setPersonas={setPersonas}
                    enabledAgents={enabledAgents} setEnabledAgents={setEnabledAgents}
                    agentStatuses={agentStatuses} running={running} loaded={loaded}
                    currentThinking={currentThinking} runCouncil={runCouncil} stopCouncil={stopCouncil}
                    tokenBudget={tokenBudget} setTokenBudget={setTokenBudget}
                    maxDuration={maxDuration} setMaxDuration={setMaxDuration}
                wantTree={wantTree} setWantTree={setWantTree}
                    isDark={isDark} brd={brd} bg={bg} bgI={bgI} tM={tM} tS={tS} inp={inp}
                />

                {/* Table (fills remaining space) */}
                <CouncilTable
                    lastResult={lastResult} comparison={comparison}
                    activeTab={activeTab} setActiveTab={setActiveTab}
                    saveStatus={saveStatus} shareLink={shareLink}
                    saveAsTable={saveAsTable} shareResult={shareResult}
                    setLastResult={setLastResult} setSaveStatus={setSaveStatus} setShareLink={setShareLink}
                    topic={topic} topicDesc={topicDesc}
                    input={input} setInput={setInput} runCouncil={runCouncil} running={running} stopCouncil={stopCouncil}
                    personas={personas} enabledAgents={enabledAgents}
                    agentStatuses={agentStatuses} currentThinking={currentThinking}
                    elapsedMs={elapsedMs} mode={mode}
                    isDark={isDark} brd={brd} bg={bg} bgI={bgI} tM={tM} tS={tS}
                    councilWarning={councilWarning}
                    councilRecommendation={councilRecommendation}
                />
            </div>
        </div>
    );
}
