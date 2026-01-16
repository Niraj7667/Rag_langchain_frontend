import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'; // npm install uuid
import "./app.css"

const API_BASE_URL = "http://localhost:8000";

const RagApp = () => {
    const [sessionId, setSessionId] = useState("");
    const [input, setInput] = useState("");
    const [url, setUrl] = useState("");
    const [file, setFile] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");

    // 1. Session Initialization (Guest Mode)
    useEffect(() => {
        let id = localStorage.getItem("rag_session_id");
        if (!id) {
            id = uuidv4();
            localStorage.setItem("rag_session_id", id);
        }
        setSessionId(id);
    }, []);

    const handleFileUpload = async () => {
    if (!file) return alert("Select a PDF first");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);

    console.log("Sending request to backend with Session:", sessionId);
    setStatus("Uploading...");

    try {
        const response = await axios.post(`${API_BASE_URL}/upload-pdf`, formData);
        
        // LOG THE FULL DATA
        console.log("Full Backend Response:", response.data);

        if (response.data.status && response.data.status.startsWith("Success")) {
            setStatus("PDF uploaded and indexed!");
        } else {
            // This displays "Duplicate detected" or "No documents provided" on screen
            setStatus(`Upload Issue: ${response.data.status}`);
            console.warn("Backend returned non-success status:", response.data.status);
        }
    } catch (err) {
        console.error("Network/CORS Error:", err);
        setStatus("Upload failed (Check Console for details)");
    }
};

    const handleUrlSubmit = async () => {
    if (!url) return;
    setStatus("Scraping URL...");
    
    const formData = new FormData();
    formData.append("url", url);
    formData.append("session_id", sessionId);

    try {
        // 1. Capture the response
        const response = await axios.post(`${API_BASE_URL}/add-url`, formData);
        
        // 2. Check the actual 'status' message from your Python function
        if (response.data.status === "Duplicate detected.") {
            setStatus("This URL is already in your context.");
        } else if (response.data.status.startsWith("Success")) {
            setStatus("URL indexed successfully!");
        } else {
            setStatus(response.data.status); // Displays "No documents provided" etc.
        }
    } catch (err) {
        console.error(err);
        setStatus("URL indexing failed (Server Error).");
    }
};

    // 4. Chat Handler
    const handleChat = async () => {
        if (!input) return;
        setLoading(true);
        const userMessage = { role: "user", text: input };
        setChatHistory(prev => [...prev, userMessage]);

        try {
            const response = await axios.post(`${API_BASE_URL}/chat`, {
                message: input,
                session_id: sessionId,
                search_mode: "both" // Searches both global and user data
            });

            const botMessage = { 
                role: "bot", 
                text: response.data.answer,
                sources: response.data.sources 
            };
            setChatHistory(prev => [...prev, botMessage]);
        } catch (err) {
            console.error(err);
        }
        setInput("");
        setLoading(false);
    };

    return (
    <div className="rag-container">
        <header className="header">
            <h2>Guest RAG Assistant</h2>
            <span className="session-badge">ID: {sessionId.slice(0, 8)}...</span>
            <div style={{fontSize: '13px', marginTop: '5px', color: status.includes('failed') ? 'red' : '#059669'}}>
                {status || "System Ready"}
            </div>
        </header>

        {/* Inputs Section */}
        <div className="control-panel">
            <div className="input-wrapper">
                <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".pdf" style={{fontSize: '12px'}} />
                <button onClick={handleFileUpload}>Upload</button>
            </div>
            <div className="input-wrapper">
                <input 
                    type="text" 
                    placeholder="Enter URL..." 
                    value={url} 
                    onChange={(e) => setUrl(e.target.value)} 
                    style={{border: 'none', outline: 'none', width: '100%'}}
                />
                <button onClick={handleUrlSubmit}>Index</button>
            </div>
        </div>

        {/* Chat Section */}
        <div className="chat-window">
            {chatHistory.map((msg, i) => (
                <div key={i} className={`message-row ${msg.role === 'user' ? 'user-row' : 'bot-row'}`}>
                    <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                        {msg.text}
                        {msg.role === 'bot' && msg.sources && msg.sources.length > 0 && (
                            <div className="source-container">
                                <strong>Sources:</strong> {msg.sources.join(', ')}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {loading && <div className="bot-row"><div className="bot-bubble">Typing...</div></div>}
        </div>

        {/* Input Area */}
        <div className="chat-footer">
            <input 
                className="main-input"
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Ask a question..."
                onKeyPress={(e) => e.key === 'Enter' && handleChat()}
            />
            <button onClick={handleChat} disabled={loading} style={{padding: '12px 24px'}}>
                {loading ? "..." : "Send"}
            </button>
        </div>
    </div>
);
};

export default RagApp;