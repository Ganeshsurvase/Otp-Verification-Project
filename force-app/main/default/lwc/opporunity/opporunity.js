import { LightningElement, track } from 'lwc';
import getOpportunityMappingFields from '@salesforce/apex/OpportunityCSVMapperController.getOpportunityMappingFields';
import saveOpportunityRecords from '@salesforce/apex/OpportunityCSVMapperController.saveOpportunityRecords';

export default class CsvUploader extends LightningElement {
    // wizard state
    @track step = 1;
    get isStep1() { return this.step === 1; }
    get isStep2() { return this.step === 2; }
    get isStep3() { return this.step === 3; }

    get currentStep() {
        if (this.step === 1) return "1";
        if (this.step === 2) return "2";
        if (this.step === 3) return "3";
        return "4"; // after save
    }

    // csv data
    @track headers = [];
    @track csvRecords = [];
    @track previewRows = [];
    @track previewRowsDisplay = [];
    @track displayCount = 20;
    fileName;
    disableNext = true;

    // mapping
    @track fieldOptions = [];
    @track mappingRows = [];
    @track saving = false;
    @track saveResult = null;

    // Step nav
    goToPreview = () => { this.step = 2; };
    goToUpload = () => { this.step = 1; };

    // Upload & parse CSV
    handleFileUpload(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        this.fileName = file.name;
        this.disableNext = true;

        const reader = new FileReader();
        reader.onload = () => {
            const text = reader.result;
            const rows = this.parseCSV(text);
            if (!rows || rows.length < 1) {
                this.headers = [];
                this.csvRecords = [];
                this.previewRows = [];
                this.previewRowsDisplay = [];
                this.disableNext = true;
                return;
            }

            this.headers = rows[0];
            const recs = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const obj = {};
                for (let c = 0; c < this.headers.length; c++) {
                    obj[this.headers[c]] = (c < row.length) ? row[c] : '';
                }
                recs.push(obj);
            }
            this.csvRecords = recs;

            this.previewRows = recs.slice(0, this.displayCount);
            this.previewRowsDisplay = this.buildPreviewRowsDisplay(this.previewRows, this.headers);

            this.disableNext = false;
        };
        reader.readAsText(file, 'UTF-8');
    }

    buildPreviewRowsDisplay(rows, headers) {
        return rows.map((r, ridx) => {
            const cols = headers.map((h, cidx) => ({
                k: `cell-${ridx}-${cidx}`,
                header: h,
                value: r[h] ?? ''
            }));
            return { id: `row-${ridx}`, cols };
        });
    }

    goToMapping = () => {
        getOpportunityMappingFields()
            .then(fields => {
                this.fieldOptions = fields.map(f => ({ label: f.label, value: f.apiName }));

                this.mappingRows = this.headers.map(hdr => {
                    const normalized = (hdr || '').trim().toLowerCase().replace(/\s+/g, '');
                    let matchedApi = '';
                    for (const f of fields) {
                        const lab = (f.label || '').toLowerCase().replace(/\s+/g, '');
                        const api = (f.apiName || '').toLowerCase().replace(/\s+/g, '');
                        if (normalized === lab || normalized === api || lab.includes(normalized) || api.includes(normalized)) {
                            matchedApi = f.apiName;
                            break;
                        }
                    }
                    const sample = (this.csvRecords.length > 0 && this.csvRecords[0][hdr]) ? this.csvRecords[0][hdr] : '';
                    return { header: hdr, apiName: matchedApi, sample };
                });

                this.step = 3;
            })
            .catch(err => {
                console.error('getOpportunityMappingFields error', err);
                this.fieldOptions = [];
                this.mappingRows = this.headers.map(hdr => ({
                    header: hdr,
                    apiName: '',
                    sample: (this.csvRecords.length > 0 ? this.csvRecords[0][hdr] : '')
                }));
                this.step = 3;
            });
    };

    handleFieldChange(event) {
        const header = event.target.dataset.header;
        const value = event.detail.value;
        this.mappingRows = this.mappingRows.map(m => (m.header === header ? { ...m, apiName: value } : m));
    }

    saveMappedRecords = () => {
        this.saving = true;
        this.saveResult = null;

        const mappingsPayload = this.mappingRows.map(m => ({ header: m.header, apiName: m.apiName, sample: m.sample }));
        const recordsJson = JSON.stringify(this.csvRecords);
        const mappingsJson = JSON.stringify(mappingsPayload);

        saveOpportunityRecords({
            mappingsJson,
            recordsJson
        })
            .then(res => {
                if (res && res.errors && Array.isArray(res.errors)) {
                    res.errors = res.errors.map(e => (typeof e === 'string' ? e : JSON.stringify(e)));
                }
                this.saveResult = res || { success: false, insertedCount: 0, skippedCount: 0, errors: ['Unknown error'] };
                this.step = 4; // move to Save step
            })
            .catch(err => {
                const msg = err && err.body && err.body.message ? err.body.message : String(err);
                this.saveResult = { success: false, insertedCount: 0, skippedCount: 0, errors: [msg] };
                this.step = 4;
            })
            .finally(() => {
                this.saving = false;
            });
    };

    parseCSV(text) {
        const rows = [];
        let cur = '';
        let row = [];
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const nxt = i < text.length - 1 ? text[i + 1] : null;

            if (ch === '"') {
                if (inQuotes && nxt === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === ',' && !inQuotes) {
                row.push(cur);
                cur = '';
            } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
                if (ch === '\r' && nxt === '\n') {
                }
                if (cur !== '' || row.length > 0) {
                    row.push(cur);
                    rows.push(row);
                    row = [];
                    cur = '';
                } else {
                    cur = '';
                }
            } else {
                cur += ch;
            }
        }
        if (cur !== '' || row.length > 0) {
            row.push(cur);
            rows.push(row);
        }

        return rows.map(r => r.map(c => (c == null ? '' : String(c).trim())));
    }

    get errorMessagesWithKey() {
        return (this.saveResult?.errors || []).map((msg, i) => {
            return { id: `err-${i}`, text: msg };
        });
    }
}