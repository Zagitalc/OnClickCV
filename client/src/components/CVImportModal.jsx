import React, { useEffect, useState } from "react";
import ParsedCVReview from "./ParsedCVReview";

const CVImportModal = ({
    isOpen,
    onClose,
    onParse,
    onConfirm,
    parsedCv,
    warnings = [],
    status = "idle",
    error = ""
}) => {
    const [text, setText] = useState("");

    useEffect(() => {
        if (!isOpen) {
            setText("");
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleParse = () => {
        onParse(text);
    };

    return (
        <div className="import-modal-root" role="dialog" aria-modal="true" aria-label="Import existing CV">
            <div className="import-modal-panel">
                <div className="import-modal-header">
                    <div>
                        <h2>Import Existing CV</h2>
                        <p>Paste plain CV text and review the detected sections before importing.</p>
                    </div>
                    <button type="button" className="preview-modal-close" onClick={onClose} aria-label="Close import modal">
                        ×
                    </button>
                </div>

                {!parsedCv ? (
                    <div className="import-modal-body">
                        <label htmlFor="cv-import-text" className="form-label">Paste your CV text below</label>
                        <textarea
                            id="cv-import-text"
                            aria-label="Paste CV text"
                            className="form-textarea import-textarea"
                            rows={14}
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            placeholder="Paste your current CV text here..."
                        />
                        <div className="import-limitations">
                            Works best with single-column CVs and clear section headings. PDF/DOCX upload is not
                            supported in this first version.
                        </div>
                        {error ? <div className="form-error">{error}</div> : null}
                        <div className="button-row">
                            <button
                                type="button"
                                className="primary-btn"
                                onClick={handleParse}
                                disabled={status === "loading"}
                            >
                                {status === "loading" ? "Parsing..." : "Parse CV"}
                            </button>
                            <button type="button" className="remove-btn" onClick={onClose}>
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="import-modal-body">
                        <ParsedCVReview
                            cvData={parsedCv}
                            warnings={warnings}
                            onConfirm={onConfirm}
                            onCancel={onClose}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CVImportModal;
