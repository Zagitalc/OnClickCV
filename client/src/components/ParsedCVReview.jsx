import React from "react";
import { extractRichText } from "../utils/richText";

const SECTION_LABELS = [
    ["personal", "Personal Details"],
    ["summary", "Summary"],
    ["skills", "Skills"],
    ["projects", "Projects"],
    ["workExperience", "Work Experience"],
    ["volunteerExperience", "Volunteer Experience"],
    ["education", "Education"],
    ["certifications", "Certifications"],
    ["awards", "Awards"],
    ["additionalInfo", "Additional Info"]
];

const hasText = (value) => String(value || "").trim().length > 0;
const hasItems = (value) => Array.isArray(value) && value.length > 0;

export const getDetectedSections = (cvData = {}) => {
    const detected = [];
    const notDetected = [];

    SECTION_LABELS.forEach(([key, label]) => {
        let isDetected = false;
        if (key === "personal") {
            isDetected = [cvData.name, cvData.email, cvData.phone, cvData.linkedin].some(hasText);
        } else if (["summary", "additionalInfo"].includes(key)) {
            isDetected = hasText(cvData[key]);
        } else {
            isDetected = hasItems(cvData[key]);
        }

        if (isDetected) {
            detected.push(label);
        } else {
            notDetected.push(label);
        }
    });

    return { detected, notDetected };
};

const stripHtml = (value = "") => extractRichText(value);

const previewArray = (items = []) => items.map(stripHtml).filter(Boolean).slice(0, 3).join(" | ");
const DEFAULT_IMPORT_WARNING =
    "This import is a first draft. Please review the detected sections before exporting. Some formatting or section placement may need manual adjustment.";

const ParsedCVReview = ({ cvData = {}, warnings = [], onConfirm, onCancel }) => {
    const { detected, notDetected } = getDetectedSections(cvData);
    const displayedWarnings = warnings.length ? warnings : [DEFAULT_IMPORT_WARNING];

    return (
        <div className="parsed-cv-review" aria-label="Parsed CV review">
            {displayedWarnings.map((warning) => (
                <div key={warning} className="import-warning">{warning}</div>
            ))}

            <div className="review-grid">
                <div className="review-detected-card">
                    <h4>Detected:</h4>
                    {detected.length ? (
                        <ul>
                            {detected.map((label) => (
                                <li key={label}>✓ {label}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>No sections detected.</p>
                    )}
                </div>
                <div className="review-detected-card">
                    <h4>Not detected:</h4>
                    {notDetected.length ? (
                        <ul>
                            {notDetected.map((label) => (
                                <li key={label}>- {label}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>All supported sections detected.</p>
                    )}
                </div>
            </div>

            <div className="parsed-section-list">
                {hasText(cvData.name) || hasText(cvData.email) || hasText(cvData.phone) || hasText(cvData.linkedin) ? (
                    <section>
                        <h4>Personal Details</h4>
                        <p>{[cvData.name, cvData.email, cvData.phone, cvData.linkedin].filter(hasText).join(" | ")}</p>
                    </section>
                ) : null}
                {hasText(cvData.summary) ? (
                    <section>
                        <h4>Summary</h4>
                        <p>{cvData.summary}</p>
                    </section>
                ) : null}
                {hasItems(cvData.skills) ? (
                    <section>
                        <h4>Skills</h4>
                        <p>{cvData.skills.join(", ")}</p>
                    </section>
                ) : null}
                {hasItems(cvData.projects) ? (
                    <section>
                        <h4>Projects</h4>
                        <p>{previewArray(cvData.projects)}</p>
                    </section>
                ) : null}
                {hasItems(cvData.workExperience) ? (
                    <section>
                        <h4>Work Experience</h4>
                        <p>{previewArray(cvData.workExperience)}</p>
                    </section>
                ) : null}
                {hasItems(cvData.volunteerExperience) ? (
                    <section>
                        <h4>Volunteer Experience</h4>
                        <p>{previewArray(cvData.volunteerExperience)}</p>
                    </section>
                ) : null}
                {hasItems(cvData.education) ? (
                    <section>
                        <h4>Education</h4>
                        <p>{cvData.education.map((entry) => [entry.school, entry.degree].filter(hasText).join(" - ")).join(" | ")}</p>
                    </section>
                ) : null}
                {hasItems(cvData.certifications) ? (
                    <section>
                        <h4>Certifications</h4>
                        <p>{previewArray(cvData.certifications)}</p>
                    </section>
                ) : null}
                {hasItems(cvData.awards) ? (
                    <section>
                        <h4>Awards</h4>
                        <p>{previewArray(cvData.awards)}</p>
                    </section>
                ) : null}
                {hasText(cvData.additionalInfo) ? (
                    <section>
                        <h4>Additional Info</h4>
                        <p>{stripHtml(cvData.additionalInfo)}</p>
                    </section>
                ) : null}
            </div>

            <div className="import-confirm-warning">
                This will replace existing content only in sections where imported content was detected. Empty parsed
                fields will not overwrite your current CV.
            </div>
            <div className="button-row">
                <button type="button" className="primary-btn" onClick={onConfirm}>
                    Import Detected Sections
                </button>
                <button type="button" className="remove-btn" onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default ParsedCVReview;
